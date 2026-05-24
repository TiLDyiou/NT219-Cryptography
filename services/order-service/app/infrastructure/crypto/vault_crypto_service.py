import base64
import hashlib
import hmac
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.domain.ports.crypto_service import CryptoService, EventSignature, HmacSignature
from app.infrastructure.crypto.digital_signature import EventSigner
from app.infrastructure.crypto.envelope_encryption import EnvelopeEncryptor
from app.infrastructure.crypto.hmac_signer import HmacSigner


class VaultCryptoService(CryptoService):
    def __init__(
        self,
        envelope: EnvelopeEncryptor,
        hmac_signer: HmacSigner,
        event_signer: EventSigner,
    ):
        self._envelope = envelope
        self._hmac = hmac_signer
        self._events = event_signer

    async def encrypt_field(self, plaintext: str | None) -> bytes | None:
        if plaintext is None:
            return None
        return await self._envelope.encrypt(plaintext)

    async def decrypt_field(self, blob: bytes | None) -> str | None:
        if blob is None:
            return None
        return await self._envelope.decrypt(blob)

    async def sign_request(
        self,
        method: str,
        path: str,
        body: bytes,
        timestamp: str,
        nonce: str,
    ) -> HmacSignature:
        value, key_version = await self._hmac.sign(method, path, body, timestamp, nonce)
        return HmacSignature(
            value=value,
            key_version=key_version,
            timestamp=timestamp,
            nonce=nonce,
        )

    async def verify_request(
        self,
        method: str,
        path: str,
        body: bytes,
        timestamp: str,
        nonce: str,
        signature: str,
    ) -> bool:
        return await self._hmac.verify(method, path, body, timestamp, nonce, signature)

    async def sign_event(self, event_data: dict[str, Any]) -> EventSignature:
        return await self._events.sign_event(event_data)

    async def verify_event(self, event_envelope: dict[str, Any]) -> bool:
        return await self._events.verify_event(event_envelope)


class LocalDevCryptoService(CryptoService):
    """Development-only crypto when Vault is unavailable."""

    BLOB_VERSION = 0xFE

    def __init__(self, dev_secret: str = "local-dev-order-crypto-key-32b!"):
        key_material = hashlib.sha256(dev_secret.encode()).digest()
        self._dek = key_material
        self._hmac_key = hashlib.sha256(b"hmac:" + key_material).digest()

    async def encrypt_field(self, plaintext: str | None) -> bytes | None:
        if plaintext is None:
            return None
        iv = os.urandom(12)
        cipher = AESGCM(self._dek)
        ciphertext_with_tag = cipher.encrypt(iv, plaintext.encode("utf-8"), None)
        return self.BLOB_VERSION.to_bytes(1, "big") + iv + ciphertext_with_tag

    async def decrypt_field(self, blob: bytes | None) -> str | None:
        if blob is None:
            return None
        if blob[0] != self.BLOB_VERSION:
            raise ValueError("Unsupported local dev blob version")
        iv = blob[1:13]
        ciphertext_with_tag = blob[13:]
        cipher = AESGCM(self._dek)
        return cipher.decrypt(iv, ciphertext_with_tag, None).decode("utf-8")

    async def sign_request(
        self,
        method: str,
        path: str,
        body: bytes,
        timestamp: str,
        nonce: str,
    ) -> HmacSignature:
        from app.infrastructure.crypto.hmac_signer import build_canonical_request

        canonical = build_canonical_request(method, path, timestamp, nonce, body)
        digest = hmac.new(
            self._hmac_key, canonical.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return HmacSignature(
            value=f"dev:v1:{digest}",
            key_version=0,
            timestamp=timestamp,
            nonce=nonce,
        )

    async def verify_request(
        self,
        method: str,
        path: str,
        body: bytes,
        timestamp: str,
        nonce: str,
        signature: str,
    ) -> bool:
        expected = await self.sign_request(method, path, body, timestamp, nonce)
        return hmac.compare_digest(expected.value, signature)

    async def sign_event(self, event_data: dict[str, Any]) -> EventSignature:
        canonical = json.dumps(event_data, sort_keys=True, separators=(",", ":"))
        digest = hmac.new(
            self._hmac_key, canonical.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return EventSignature(
            algorithm="dev-hmac-sha256",
            key_version=0,
            value=f"dev:v1:{digest}",
            signed_hash="sha2-256",
        )

    async def verify_event(self, event_envelope: dict[str, Any]) -> bool:
        envelope = dict(event_envelope)
        signature_block = envelope.pop("signature")
        canonical = json.dumps(envelope, sort_keys=True, separators=(",", ":"))
        digest = hmac.new(
            self._hmac_key, canonical.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature_block["value"], f"dev:v1:{digest}")
