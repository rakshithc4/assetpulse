"""KPI calculation formulas. Definitions match
docs/superpowers/specs/2026-07-16-assetpulse-design.md §6:
MTTR = mean(completed_at - started_at) over COMPLETED orders, in hours.
Availability % = count(OPERATIONAL equipment) / count(all equipment) * 100.
Backlog aging buckets open (REPORTED) requests by age in days: 0-7, 8-30, 30+.
Frequency counts requests per equipment type, created within the last 90 days.
"""

from datetime import datetime, timedelta
from statistics import mean


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def mttr_hours(orders: list[dict]) -> float:
    completed = [
        o
        for o in orders
        if o["Status"] == "COMPLETED" and o.get("StartedAt") and o.get("CompletedAt")
    ]
    if not completed:
        return 0.0
    durations = [
        (parse_iso(o["CompletedAt"]) - parse_iso(o["StartedAt"])).total_seconds() / 3600
        for o in completed
    ]
    return round(mean(durations), 2)


def equipment_availability_pct(equipment: list[dict]) -> float:
    if not equipment:
        return 0.0
    operational = sum(1 for e in equipment if e["OpStatus"] == "OPERATIONAL")
    return round(operational / len(equipment) * 100, 1)


def open_requests_by_severity(requests: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for r in requests:
        if r["Status"] == "REPORTED":
            counts[r["Severity"]] = counts.get(r["Severity"], 0) + 1
    return counts


def open_orders_count(orders: list[dict]) -> int:
    return sum(1 for o in orders if o["Status"] in ("CREATED", "SCHEDULED", "IN_PROGRESS"))


def total_downtime_hours(orders: list[dict], now: datetime, days: int) -> float:
    cutoff = now - timedelta(days=days)
    total = sum(
        o["DowntimeHours"]
        for o in orders
        if o["Status"] == "COMPLETED"
        and o.get("CompletedAt")
        and parse_iso(o["CompletedAt"]) >= cutoff
    )
    return round(total, 2)


def downtime_grouped(
    orders: list[dict], equipment: list[dict], by: str, now: datetime, days: int = 90
) -> list[dict]:
    equip_by_id = {e["EquipId"]: e for e in equipment}
    key = "Site" if by == "site" else "EquipType"
    cutoff = now - timedelta(days=days)
    totals: dict[str, float] = {}
    for o in orders:
        if o["Status"] != "COMPLETED" or not o.get("CompletedAt"):
            continue
        if parse_iso(o["CompletedAt"]) < cutoff:
            continue
        equip = equip_by_id.get(o["EquipId"])
        if not equip:
            continue
        group = equip[key]
        totals[group] = totals.get(group, 0) + o["DowntimeHours"]
    return [
        {"group": group, "downtime_hours": round(hours, 2)}
        for group, hours in sorted(totals.items())
    ]


def backlog_aging(requests: list[dict], now: datetime) -> list[dict]:
    buckets = {"0-7": 0, "8-30": 0, "30+": 0}
    for r in requests:
        if r["Status"] != "REPORTED":
            continue
        age_days = (now - parse_iso(r["CreatedAt"])).days
        if age_days <= 7:
            buckets["0-7"] += 1
        elif age_days <= 30:
            buckets["8-30"] += 1
        else:
            buckets["30+"] += 1
    return [{"range": range_, "count": count} for range_, count in buckets.items()]


def frequency_by_type(
    requests: list[dict], equipment: list[dict], now: datetime, days: int = 90
) -> list[dict]:
    equip_by_id = {e["EquipId"]: e for e in equipment}
    cutoff = now - timedelta(days=days)
    counts: dict[str, int] = {}
    for r in requests:
        if parse_iso(r["CreatedAt"]) < cutoff:
            continue
        equip = equip_by_id.get(r["EquipId"])
        if not equip:
            continue
        equip_type = equip["EquipType"]
        counts[equip_type] = counts.get(equip_type, 0) + 1
    return [{"equip_type": t, "count": c} for t, c in sorted(counts.items())]
