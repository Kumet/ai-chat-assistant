from __future__ import annotations

from fastapi.testclient import TestClient

from src.main import app
from src.services.fixit import FixItResult

client = TestClient(app)


def test_fixit_route_created(monkeypatch) -> None:
    async def fake_execute(self):
        return FixItResult(
            status="created",
            branch_name="fixit/20250101010101",
            pr_url="https://example.com/pr/1",
            logs=["FixIt executed"],
        )

    monkeypatch.setattr("src.routes.tools.FixItRunner.execute", fake_execute)

    response = client.post("/tools/fixit", json={})
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "created"
    assert payload["branchName"] == "fixit/20250101010101"
    assert payload["prUrl"] == "https://example.com/pr/1"
    assert payload["logs"] == ["FixIt executed"]


def test_fixit_route_failed(monkeypatch) -> None:
    async def fake_execute(self):
        return FixItResult(
            status="failed",
            logs=["command failed"],
            error="GITHUB_TOKEN is not set",
        )

    monkeypatch.setattr("src.routes.tools.FixItRunner.execute", fake_execute)

    response = client.post("/tools/fixit", json={})
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "failed"
    assert payload["error"] == "GITHUB_TOKEN is not set"
    assert payload["logs"] == ["command failed"]
