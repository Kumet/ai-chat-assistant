from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Iterable


@dataclass
class MetricRecord:
    method: str
    path: str
    duration_ms: float
    tokens: int
    cache_hit: bool
    timestamp: str

    def as_dict(self) -> dict[str, str | float | int | bool]:
        return asdict(self)


_MAX_RECORDS = 50
_STORE: deque[MetricRecord] = deque(maxlen=_MAX_RECORDS)


def add_metric(record: MetricRecord) -> None:
    _STORE.append(record)


def latest(limit: int = 10, path: str | None = None) -> list[MetricRecord]:
    records: Iterable[MetricRecord] = reversed(_STORE)
    if path:
        records = (record for record in records if record.path == path)
    result: list[MetricRecord] = []
    for record in records:
        result.append(record)
        if len(result) >= limit:
            break
    return result


def create_record(
    *,
    method: str,
    path: str,
    duration_ms: float,
    tokens: int,
    cache_hit: bool,
) -> MetricRecord:
    return MetricRecord(
        method=method,
        path=path,
        duration_ms=duration_ms,
        tokens=tokens,
        cache_hit=cache_hit,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
