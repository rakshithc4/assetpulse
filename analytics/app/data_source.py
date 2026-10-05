import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.cache import ttl_cache
from app.config import MOCK_MODE
from app.sap_client import fetch_entity

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"
CACHE_TTL_SECONDS = 300

# Fixture timestamps are authored relative to this anchor (the spec date). KPI
# formulas use rolling now-relative windows (30d/90d), so on a real clock the
# fixtures would drift stale and demos/tests would show hollowed-out numbers.
# Shifting every fixture date by (today - anchor) keeps the *relative* ages
# baked into the fixtures constant no matter when this runs.
# ponytail: fixed anchor, not per-fixture-file metadata — revisit if fixtures
# ever get authored on a different baseline date.
_FIXTURE_ANCHOR = datetime(2026, 7, 16, tzinfo=UTC)
_DATE_FIELDS: dict[str, tuple[str, ...]] = {
    "requests": ("CreatedAt",),
    "orders": ("StartedAt", "CompletedAt"),
}


def _shift_iso(value: str, delta: timedelta) -> str:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00")) + delta
    return dt.isoformat().replace("+00:00", "Z")


def _load_fixture(name: str) -> list[dict]:
    records = json.loads((FIXTURES_DIR / f"{name}.json").read_text())
    date_fields = _DATE_FIELDS.get(name)
    if date_fields:
        delta = datetime.now(UTC) - _FIXTURE_ANCHOR
        for record in records:
            for field in date_fields:
                if record.get(field):
                    record[field] = _shift_iso(record[field], delta)
    return records


@ttl_cache(CACHE_TTL_SECONDS)
async def load_equipment() -> list[dict]:
    return _load_fixture("equipment") if MOCK_MODE else await fetch_entity("Equipment")


@ttl_cache(CACHE_TTL_SECONDS)
async def load_requests() -> list[dict]:
    return _load_fixture("requests") if MOCK_MODE else await fetch_entity("MaintenanceRequest")


@ttl_cache(CACHE_TTL_SECONDS)
async def load_orders() -> list[dict]:
    return _load_fixture("orders") if MOCK_MODE else await fetch_entity("WorkOrder")
