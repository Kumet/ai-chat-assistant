"""SLO metrics endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from ..metrics.store import latest

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/slo/latest")
async def get_latest_slo_metrics(
	limit: int = Query(5, ge=1, le=50),
	path: str | None = Query(default=None),
) -> dict[str, list[dict[str, object]]]:
	"""Return the latest SLO metrics records."""

	records = [record.as_dict() for record in latest(limit=limit, path=path)]
	return {"records": records}
