import base64
import hashlib
from app.infrastructure.crypto.vault_transit import VaultTransit


def build_canonical_request(
    method: str, path: str, timestamp: str, nonce: str, body: bytes
) -> str:
    body_hash = hashlib.sha256(body).hexdigest()
    return f"{method.upper()}\n{path}\n{timestamp}\n{nonce}\n{body_hash}"


class HmacSigner:
    def __init__(self, vault_transit: VaultTransit, key_name: str = "notification-hmac-key"):
        self._transit = vault_transit
        self._key_name = key_name

    async def sign(
        self, method: str, path: str, body: bytes, timestamp: str, nonce: str
    ) -> tuple[str, int]:
        canonical = build_canonical_request(method, path, timestamp, nonce, body)
        result = await self._transit.hmac(
            key_name=self._key_name,
            input_data=base64.b64encode(canonical.encode("utf-8")).decode("ascii"),
        )
        return result["hmac"], int(result.get("key_version", 1))

    async def verify(
        self,
        method: str,
        path: str,
        body: bytes,
        timestamp: str,
        nonce: str,
        signature: str,
    ) -> bool:
        canonical = build_canonical_request(method, path, timestamp, nonce, body)
        return await self._transit.verify_hmac(
            key_name=self._key_name,
            input_data=base64.b64encode(canonical.encode("utf-8")).decode("ascii"),
            hmac_value=signature,
        )
