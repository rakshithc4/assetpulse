import json
from pathlib import Path

from app.config import MOCK_MODE

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def _load_fixture(name: str) -> list[dict]:
    return json.loads((FIXTURES_DIR / f"{name}.json").read_text())


async def load_equipment() -> list[dict]:
    if MOCK_MODE:
        return _load_fixture("equipment")
    raise RuntimeError("Live SAP fetch not wired yet — see Task 5.6")


async def load_requests() -> list[dict]:
    if MOCK_MODE:
        return _load_fixture("requests")
    raise RuntimeError("Live SAP fetch not wired yet — see Task 5.6")


async def load_orders() -> list[dict]:
    if MOCK_MODE:
        return _load_fixture("orders")
    raise RuntimeError("Live SAP fetch not wired yet — see Task 5.6")
