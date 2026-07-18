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


def test_kpi_downtime_by_site():
    response = client.get("/kpi/downtime?by=site")
    assert response.status_code == 200
    body = response.json()
    assert body["by"] == "site"
    assert body["data"] == [
        {"group": "Goldfields Site B", "downtime_hours": 10.0},
        {"group": "Pilbara Site A", "downtime_hours": 10.0},
    ]


def test_kpi_downtime_by_type():
    response = client.get("/kpi/downtime?by=type")
    body = response.json()
    assert body["data"] == [
        {"group": "CONVEYOR", "downtime_hours": 4.0},
        {"group": "CRUSHER", "downtime_hours": 6.0},
        {"group": "PUMP", "downtime_hours": 10.0},
    ]


def test_kpi_backlog_aging():
    response = client.get("/kpi/backlog-aging")
    assert response.status_code == 200
    assert response.json()["buckets"] == [
        {"range": "0-7", "count": 1},
        {"range": "8-30", "count": 1},
        {"range": "30+", "count": 2},
    ]
