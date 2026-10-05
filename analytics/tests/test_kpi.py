import json
from datetime import UTC, datetime
from pathlib import Path

from app.kpi import (
    backlog_aging,
    downtime_grouped,
    equipment_availability_pct,
    frequency_by_type,
    mttr_hours,
    open_orders_count,
    open_requests_by_severity,
    total_downtime_hours,
)

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
NOW = datetime(2026, 7, 17, 0, 0, 0, tzinfo=UTC)


def load(name: str) -> list[dict]:
    return json.loads((FIXTURES / f"{name}.json").read_text())


def test_mttr_hours():
    orders = load("orders")
    assert mttr_hours(orders) == 6.67  # mean(6, 4, 10) hours, rounded to 2dp


def test_equipment_availability_pct():
    equipment = load("equipment")
    assert equipment_availability_pct(equipment) == 60.0  # 3 of 5 OPERATIONAL


def test_open_requests_by_severity():
    requests = load("requests")
    assert open_requests_by_severity(requests) == {"HIGH": 1, "MEDIUM": 1, "CRITICAL": 1, "LOW": 1}


def test_open_orders_count():
    orders = load("orders")
    assert open_orders_count(orders) == 3  # IN_PROGRESS + SCHEDULED + CREATED


def test_total_downtime_hours_30d():
    orders = load("orders")
    # only the two orders completed within 30d
    assert total_downtime_hours(orders, NOW, days=30) == 10.0


def test_downtime_grouped_by_site():
    orders = load("orders")
    equipment = load("equipment")
    assert downtime_grouped(orders, equipment, "site", NOW) == [
        {"group": "Goldfields Site B", "downtime_hours": 10.0},
        {"group": "Pilbara Site A", "downtime_hours": 10.0},
    ]


def test_downtime_grouped_by_type():
    orders = load("orders")
    equipment = load("equipment")
    assert downtime_grouped(orders, equipment, "type", NOW) == [
        {"group": "CONVEYOR", "downtime_hours": 4.0},
        {"group": "CRUSHER", "downtime_hours": 6.0},
        {"group": "PUMP", "downtime_hours": 10.0},
    ]


def test_backlog_aging():
    requests = load("requests")
    assert backlog_aging(requests, NOW) == [
        {"range": "0-7", "count": 1},
        {"range": "8-30", "count": 1},
        {"range": "30+", "count": 2},
    ]


def test_frequency_by_type_excludes_requests_older_than_90_days():
    requests = load("requests")
    equipment = load("equipment")
    assert frequency_by_type(requests, equipment, NOW) == [
        {"equip_type": "CONVEYOR", "count": 1},
        {"equip_type": "CRUSHER", "count": 2},
        {"equip_type": "HAUL_TRUCK", "count": 1},
        {"equip_type": "PUMP", "count": 1},
    ]
