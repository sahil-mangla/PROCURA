import logging
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.config import settings
from app.data.storage import local_store

logger = logging.getLogger(__name__)

class BackendSyncClient:
    """
    HTTP client to synchronize historical requests and final outcomes
    from the Java Backend internal endpoints (/internal/ai/*).
    """

    def __init__(self, base_url: Optional[str] = None, service_key: Optional[str] = None):
        self.base_url = (base_url or settings.backend_base_url).rstrip("/")
        self.service_key = service_key or settings.service_key

    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-Service-Key": self.service_key,
            "Accept": "application/json"
        }

    async def sync_historical_requests(self, limit: int = 500) -> int:
        """
        Pulls terminal historical requests from the backend and stores them locally.
        Returns the count of newly synced items.
        """
        last_cursor = local_store.get_sync_meta("historical_requests_cursor")
        url = f"{self.base_url}/internal/ai/historical-requests"
        total_synced = 0

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                while True:
                    params: Dict[str, Any] = {"limit": limit}
                    if last_cursor:
                        params["cursor"] = last_cursor

                    logger.info(f"Syncing historical requests from backend: {url} with params {params}")
                    response = await client.get(url, headers=self._get_headers(), params=params)

                    if response.status_code != 200:
                        logger.warning(f"Backend sync returned status {response.status_code}: {response.text}")
                        break

                    data = response.json()
                    items = data.get("items", [])
                    if not items:
                        break

                    for item in items:
                        local_store.upsert_historical_request(item, is_synthetic=False)
                        total_synced += 1

                    next_cursor = data.get("nextCursor")
                    if next_cursor:
                        last_cursor = next_cursor
                        local_store.set_sync_meta("historical_requests_cursor", next_cursor)
                    else:
                        break

            local_store.set_sync_meta("historical_requests_last_sync", datetime.utcnow().isoformat())
            logger.info(f"Successfully synced {total_synced} historical requests from backend.")
        except Exception as e:
            logger.warning(f"Unable to connect to backend for historical request sync: {e}")

        return total_synced

    async def sync_outcomes(self, limit: int = 500) -> int:
        """
        Pulls final outcomes and human overrides from the backend for the feedback loop.
        """
        last_cursor = local_store.get_sync_meta("outcomes_cursor")
        url = f"{self.base_url}/internal/ai/outcomes"
        total_synced = 0

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                while True:
                    params: Dict[str, Any] = {"limit": limit}
                    if last_cursor:
                        params["cursor"] = last_cursor

                    logger.info(f"Syncing outcomes from backend: {url} with params {params}")
                    response = await client.get(url, headers=self._get_headers(), params=params)

                    if response.status_code != 200:
                        logger.warning(f"Backend outcome sync returned status {response.status_code}: {response.text}")
                        break

                    data = response.json()
                    items = data.get("items", [])
                    if not items:
                        break

                    for item in items:
                        local_store.upsert_outcome(item)
                        total_synced += 1

                    next_cursor = data.get("nextCursor")
                    if next_cursor:
                        last_cursor = next_cursor
                        local_store.set_sync_meta("outcomes_cursor", next_cursor)
                    else:
                        break

            local_store.set_sync_meta("outcomes_last_sync", datetime.utcnow().isoformat())
            logger.info(f"Successfully synced {total_synced} outcomes from backend.")
        except Exception as e:
            logger.warning(f"Unable to connect to backend for outcome sync: {e}")

        return total_synced

backend_sync_client = BackendSyncClient()

