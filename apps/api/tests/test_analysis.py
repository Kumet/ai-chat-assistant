from __future__ import annotations

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_analysis_endpoint_returns_symbols() -> None:
    response = client.get("/graph/analyze")
    assert response.status_code == 200
    payload = response.json()
    assert "symbols" in payload
    assert len(payload["symbols"]) > 0
    assert "edges" in payload
