import base64
import hashlib
import json
from typing import Any

from app.domain.ports.crypto_service import EventSignature
from app.infrastructure.crypto.vault_transit import VaultTransit


class EventSigner:
    def __init__(self, vault_transit: VaultTransit, key_name: str = "order-sign-key"):
        self._transit = vault_transit
        self._key_name = key_name

    @staticmethod
    def _canonical_json(data: dict[str, Any]) -> str:
        return json.dumps(data, sort_keys=True, separators=(",", ":"))

    async def sign_event(self, event_data: dict[str, Any]) -> EventSignature:
        canonical = self._canonical_json(event_data)
        digest = hashlib.sha256(canonical.encode("utf-8")).digest()
        signature = await self._transit.sign(
            key_name=self._key_name,
            input_data=base64.b64encode(digest).decode("ascii"),
            hash_algorithm="sha2-256",
            prehashed=True,
        )
        return EventSignature(
            algorithm="ecdsa-p256",
            key_version=int(signature.get("key_version", 1)),
            value=signature["signature"],
            signed_hash="sha2-256",
        )

    async def verify_event(self, event_envelope: dict[str, Any]) -> bool:
        # H-08: sign_event ký TOÀN BỘ event_data (event_id, type, payload, ...), và
        # build_envelope = {**event_data, signature}. Vì vậy verify phải canonical hoá
        # envelope-trừ-signature, KHÔNG phải chỉ payload. Đây cũng đúng scheme mà
        # payment/inventory/shipping/noti dùng → order verify được event của payment.
        envelope = dict(event_envelope)
        signature_block = envelope.pop("signature", None) or {}
        signature_value = signature_block.get("value")
        if not signature_value:
            return False
        canonical = self._canonical_json(envelope)
        digest = hashlib.sha256(canonical.encode("utf-8")).digest()
        return await self._transit.verify(
            key_name=self._key_name,
            input_data=base64.b64encode(digest).decode("ascii"),
            signature=signature_value,
            hash_algorithm="sha2-256",
            prehashed=True,
        )
