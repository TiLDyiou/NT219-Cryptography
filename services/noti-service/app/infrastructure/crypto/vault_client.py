import asyncio
import logging
from typing import Any
import hvac
from app.core.config import VaultConfig

logger = logging.getLogger(__name__)


class VaultClient:
    """Manages Vault connection, authentication, and token renewal."""

    def __init__(self, config: VaultConfig):
        self._config = config
        self._client = hvac.Client(url=config.vault_addr)
        self._renewal_task: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    @property
    def client(self) -> hvac.Client:
        return self._client

    async def initialize(self) -> None:
        if not self._config.enabled:
            return
        await asyncio.to_thread(self._authenticate)
        if self._config.renewal_interval_seconds > 0 and self._client.token:
            self._renewal_task = asyncio.create_task(self._token_renewal_loop())

    async def read_kv2(self, path: str) -> dict[str, Any]:
        normalized = path.replace("secret/data/", "")
        response = await self.call(self._client.secrets.kv.v2.read_secret_version, path=normalized)
        return dict(response["data"]["data"])

    async def shutdown(self) -> None:
        if self._renewal_task:
            self._renewal_task.cancel()
            try:
                await self._renewal_task
            except asyncio.CancelledError:
                pass

    def _authenticate(self) -> None:
        if self._config.token:
            self._client.token = self._config.token
            if not self._client.is_authenticated():
                raise RuntimeError("Vault token authentication failed")
            return

        if self._config.role_id and self._config.secret_id:
            response = self._client.auth.approle.login(
                role_id=self._config.role_id,
                secret_id=self._config.secret_id,
            )
            self._client.token = response["auth"]["client_token"]
            return

        raise RuntimeError("Vault credentials not configured (token or AppRole required)")

    async def _token_renewal_loop(self) -> None:
        while True:
            await asyncio.sleep(self._config.renewal_interval_seconds)
            try:
                async with self._lock:
                    await asyncio.to_thread(self._client.auth.token.renew_self)
            except Exception:
                logger.warning("Vault token renewal failed; re-authenticating")
                try:
                    async with self._lock:
                        await asyncio.to_thread(self._authenticate)
                except Exception:
                    logger.exception("Vault re-authentication failed in renewal loop")

    async def call(self, fn, *args: Any, **kwargs: Any) -> dict[str, Any]:
        async with self._lock:
            return await asyncio.to_thread(lambda: fn(*args, **kwargs))
