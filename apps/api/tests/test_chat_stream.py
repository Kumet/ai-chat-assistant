from __future__ import annotations

import json
from typing import Any, Iterable

from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def _iter_sse_data(lines: Iterable[str]) -> Iterable[dict[str, Any]]:
	for line in lines:
		if not line:
			continue
		if line.startswith("data:"):
			yield json.loads(line.removeprefix("data:").strip())


def _read_sse_messages(response: Any) -> list[dict[str, Any]]:
	messages = []
	for payload in _iter_sse_data(response.iter_lines()):
		messages.append(payload)
		if payload.get("type") == "completed":
			break
	return messages


def test_chat_stream_emits_dummy_tokens() -> None:
    with client.stream("GET", "/chat/stream") as response:
        assert response.status_code == 200
        events = _read_sse_messages(response)

    assert any(event.get("type") == "token" for event in events)
    assert events[-1]["type"] == "completed"
