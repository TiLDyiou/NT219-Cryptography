import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.infrastructure.crypto.vault_transit import VaultTransit


class EnvelopeEncryptor:
    BLOB_VERSION = 0x01

    def __init__(self, vault_transit: VaultTransit, key_name: str = "notification-fle-key"):
        self._transit = vault_transit
        self._key_name = key_name

    async def encrypt(self, plaintext: str) -> bytes:
        dek = os.urandom(32)
        iv = os.urandom(12)
        cipher = AESGCM(dek)
        ciphertext_with_tag = cipher.encrypt(iv, plaintext.encode("utf-8"), None)

        wrapped_dek = await self._transit.encrypt(
            key_name=self._key_name,
            plaintext=base64.b64encode(dek).decode("ascii"),
        )

        wrapped_dek_bytes = wrapped_dek.encode("utf-8")
        return (
            self.BLOB_VERSION.to_bytes(1, "big")
            + len(wrapped_dek_bytes).to_bytes(2, "big")
            + wrapped_dek_bytes
            + iv
            + ciphertext_with_tag
        )

    async def decrypt(self, blob: bytes) -> str:
        if len(blob) < 3:
            raise ValueError("Invalid encryption blob")

        version = blob[0]
        if version != self.BLOB_VERSION:
            raise ValueError(f"Unsupported blob version: {version}")

        wrapped_len = int.from_bytes(blob[1:3], "big")
        offset = 3
        wrapped_dek = blob[offset : offset + wrapped_len].decode("utf-8")
        offset += wrapped_len
        iv = blob[offset : offset + 12]
        ciphertext_with_tag = blob[offset + 12 :]

        dek_b64 = await self._transit.decrypt(
            key_name=self._key_name,
            ciphertext=wrapped_dek,
        )
        dek = base64.b64decode(dek_b64)
        cipher = AESGCM(dek)
        plaintext = cipher.decrypt(iv, ciphertext_with_tag, None)
        return plaintext.decode("utf-8")
