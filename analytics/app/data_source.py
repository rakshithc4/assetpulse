import json
from pathlib import Path

from app.cache import ttl_cache
from app.config import MOCK_MODE
from app.sap_client import fetch_entity

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"
CACHE_TTL_SECONDS = 300


def _load_fixture(name: str) -> list[dict]:
    return json.loads((FIXTURES_DIR / f"{name}.json").read_text())


@ttl_cache(CACHE_TTL_SECONDS)
async def load_equipment() -> list[dict]:
    return _load_fixture("equipment") if MOCK_MODE else await fetch_entity("Equipment")


@ttl_cache(CACHE_TTL_SECONDS)
async def load_requests() -> list[dict]:
    return _load_fixture("requests") if MOCK_MODE else await fetch_entity("MaintenanceRequest")


@ttl_cache(CACHE_TTL_SECONDS)
async def load_orders() -> list[dict]:
    return _load_fixture("orders") if MOCK_MODE else await fetch_entity("WorkOrder")
