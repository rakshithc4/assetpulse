import os

os.environ["MOCK_MODE"] = "1"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_kpi_summary():
    response = client.get("/kpi/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["mttr_hours"] == 6.67
    assert body["equipment_availability_pct"] == 60.0
    assert body["open_orders"] == 3
    assert body["total_downtime_hours_30d"] == 10.0
    assert body["open_requests_by_severity"] == {"HIGH": 1, "MEDIUM": 1, "CRITICAL": 1, "LOW": 1}
