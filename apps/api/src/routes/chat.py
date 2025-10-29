"""Chat streaming endpoints."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import AsyncGenerator
from uuid import uuid4

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse


router = APIRouter(prefix="/chat", tags=["chat"])


async def _token_emitter() -> AsyncGenerator[str, None]:
    """Yield a finite sequence of token events as JSON strings."""

    tokens = [
        "AI",
        " chat",
        " assistant",
        " へ",
        " ようこそ",
        "！",
        "\n",
        "ダミー",
        " トークン",
        " を",
        " ストリーム",
        " 中",
        "...",
    ]
    total_tokens = 0
    cost_per_token = 0.000002

    for index, token in enumerate(tokens):
        total_tokens += 1
        payload = {
            "type": "token",
            "payload": {
                "id": str(uuid4()),
                "token": token,
                "index": index,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "usage": {
                "totalTokens": total_tokens,
                "totalCostUsd": round(total_tokens * cost_per_token, 6),
            },
        }
        yield json.dumps(payload, ensure_ascii=False)
        await asyncio.sleep(0.25)

    final_event = {
        "type": "completed",
        "usage": {
            "totalTokens": total_tokens,
            "totalCostUsd": round(total_tokens * cost_per_token, 6),
        },
    }
    yield json.dumps(final_event, ensure_ascii=False)


@router.get("/stream")
async def stream_chat(request: Request) -> EventSourceResponse:
    """Stream dummy token events over Server-Sent Events."""

    async def event_publisher() -> AsyncGenerator[dict[str, str], None]:
        tokens_used = 0
        async for payload in _token_emitter():
            try:
                data = json.loads(payload)
                usage = data.get("usage")
                if isinstance(usage, dict) and "totalTokens" in usage:
                    tokens_used = max(tokens_used, int(usage["totalTokens"]))
            except Exception:  # pragma: no cover - best effort parsing
                pass
            yield {"data": payload}
        request.state.slo_tokens = tokens_used
        request.state.slo_cache_hit = False

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    }
    return EventSourceResponse(event_publisher(), headers=headers)
