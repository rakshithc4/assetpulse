import httpx

from app.config import SAP_BASE_URL, SAP_PASS, SAP_SERVICE_PATH, SAP_USER


async def fetch_entity(entity: str) -> list[dict]:
    url = f"{SAP_BASE_URL}{SAP_SERVICE_PATH}/{entity}"
    async with httpx.AsyncClient(auth=(SAP_USER, SAP_PASS), timeout=10.0) as client:
        response = await client.get(url, params={"$top": 500})
        response.raise_for_status()
        return response.json()["value"]
