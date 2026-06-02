from typing import Any
from app.infrastructure.crypto.vault_client import VaultClient


class VaultTransit:
    def __init__(self, vault_client: VaultClient):
        self._vault = vault_client

    async def encrypt(self, key_name: str, plaintext: str) -> str:
        response = await self._vault.call(
            self._vault.client.secrets.transit.encrypt_data,
            name=key_name,
            plaintext=plaintext,
        )
        return response["data"]["ciphertext"]

    async def decrypt(self, key_name: str, ciphertext: str) -> str:
        response = await self._vault.call(
            self._vault.client.secrets.transit.decrypt_data,
            name=key_name,
            ciphertext=ciphertext,
        )
        return response["data"]["plaintext"]

    async def rewrap(self, key_name: str, ciphertext: str) -> str:
        response = await self._vault.call(
            self._vault.client.secrets.transit.rewrap_data,
            name=key_name,
            ciphertext=ciphertext,
        )
        return response["data"]["ciphertext"]

    async def hmac(self, key_name: str, input_data: str) -> dict[str, Any]:
        response = await self._vault.call(
            self._vault.client.secrets.transit.generate_hmac,
            name=key_name,
            hash_input=input_data,
            algorithm="sha2-256",
        )
        return response["data"]

    async def verify_hmac(self, key_name: str, input_data: str, hmac_value: str) -> bool:
        response = await self._vault.call(
            self._vault.client.secrets.transit.verify_signed_data,
            name=key_name,
            hash_input=input_data,
            hmac=hmac_value,
            hash_algorithm="sha2-256",
        )
        return bool(response["data"]["valid"])

    async def sign(
        self,
        key_name: str,
        input_data: str,
        hash_algorithm: str = "sha2-256",
        prehashed: bool = True,
    ) -> dict[str, Any]:
        response = await self._vault.call(
            self._vault.client.secrets.transit.sign_data,
            name=key_name,
            hash_input=input_data,
            hash_algorithm=hash_algorithm,
            prehashed=prehashed,
        )
        return response["data"]

    async def verify(
        self,
        key_name: str,
        input_data: str,
        signature: str,
        hash_algorithm: str = "sha2-256",
        prehashed: bool = True,
    ) -> bool:
        response = await self._vault.call(
            self._vault.client.secrets.transit.verify_signed_data,
            name=key_name,
            hash_input=input_data,
            signature=signature,
            hash_algorithm=hash_algorithm,
            prehashed=prehashed,
        )
        return bool(response["data"]["valid"])
