from __future__ import annotations

from time import perf_counter

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from ..metrics.store import add_metric, create_record


class RequestMetricsMiddleware(BaseHTTPMiddleware):
    """各リクエストの SLO 指標を集計するミドルウェア。"""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = perf_counter()
        response = await call_next(request)
        duration_ms = (perf_counter() - start_time) * 1000

        tokens = int(getattr(request.state, "slo_tokens", 0) or 0)
        cache_hit = bool(getattr(request.state, "slo_cache_hit", False))

        record = create_record(
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
            tokens=tokens,
            cache_hit=cache_hit,
        )
        add_metric(record)

        response.headers["X-SLO-Duration-Ms"] = f"{duration_ms:.2f}"
        response.headers["X-SLO-Tokens"] = str(tokens)
        response.headers["X-SLO-Cache-Hit"] = "1" if cache_hit else "0"
        return response


def mark_tokens(request: Request, tokens: int) -> None:
    request.state.slo_tokens = max(int(tokens), 0)


def mark_cache_hit(request: Request, hit: bool) -> None:
    request.state.slo_cache_hit = bool(hit)
