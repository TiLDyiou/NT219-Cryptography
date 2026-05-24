import base64
import hashlib
import json
from typing import Any
from app.domain.ports.crypto_service import EventSignature
from app.infrastructure.crypto.vault_transit import VaultTransit


class EventSigner:
    def __init__(self, vault_transit: VaultTransit, key_name: str = "payment-sign-key"):
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
        envelope = dict(event_envelope)
        signature_block = envelope.pop("signature")
        canonical = self._canonical_json(envelope)
        digest = hashlib.sha256(canonical.encode("utf-8")).digest()
        return await self._transit.verify(
            key_name=self._key_name,
            input_data=base64.b64encode(digest).decode("ascii"),
            signature=signature_block["value"],
            hash_algorithm="sha2-256",
            prehashed=True,
        )
