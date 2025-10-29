from __future__ import annotations

import json
from collections import Counter

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_tool_generate_endpoint_streams_fail_fix_pass_cycle() -> None:
    payload = {
        "conversation": [
            {"role": "user", "content": "divide 関数のゼロ除算バグを検出したい"},
            {"role": "assistant", "content": "Failing Test を用意してください"},
        ]
    }

    statuses: Counter[tuple[str, str]] = Counter()
    token_messages: list[str] = []

    with client.stream(
        "POST",
        "/tools/tests/generate",
        json=payload,
        headers={"accept": "text/event-stream"},
    ) as response:
        assert response.status_code == 200
        for line in response.iter_lines():
            if isinstance(line, bytes):
                decoded = line.decode("utf-8")
            else:
                decoded = line
            if not line:
                continue
            if decoded.startswith("data:"):
                data = json.loads(decoded.removeprefix("data:").strip())
                if data.get("type") == "tool":
                    payload_data = data["payload"]
                    statuses[(payload_data["stage"], payload_data["status"])] += 1
                    if payload_data["stage"] == "completed":
                        break
                elif data.get("type") == "token":
                    token_messages.append(data["payload"]["message"])

    assert any(stage == "pytest_initial_run" and status == "failed" for stage, status in statuses)
    assert any(stage == "pytest_rerun" and status == "succeeded" for stage, status in statuses)
    assert any("divide" in message for message in token_messages)
