from datetime import UTC, datetime

from fastapi import APIRouter

from app.data_source import load_equipment, load_orders, load_requests
from app.kpi import (
    equipment_availability_pct,
    mttr_hours,
    open_orders_count,
    open_requests_by_severity,
    total_downtime_hours,
)

router = APIRouter(prefix="/kpi")


@router.get("/summary")
async def summary():
    now = datetime.now(UTC)
    equipment = await load_equipment()
    requests = await load_requests()
    orders = await load_orders()
    return {
        "mttr_hours": mttr_hours(orders),
        "open_requests_by_severity": open_requests_by_severity(requests),
        "open_orders": open_orders_count(orders),
        "equipment_availability_pct": equipment_availability_pct(equipment),
        "total_downtime_hours_30d": total_downtime_hours(orders, now, days=30),
    }
