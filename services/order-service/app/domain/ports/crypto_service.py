from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class HmacSignature:
    value: str
    key_version: int
    timestamp: str
    nonce: str


@dataclass(frozen=True)
class EventSignature:
    algorithm: str
    key_version: int
    value: str
    signed_hash: str


class CryptoService(ABC):
    @abstractmethod
    async def encrypt_field(self, plaintext: str | None) -> bytes | None:
        raise NotImplementedError

    @abstractmethod
    async def decrypt_field(self, blob: bytes | None) -> str | None:
        raise NotImplementedError

    @abstractmethod
    async def sign_request(
        self,
        method: str,
        path: str,
        body: bytes,
        timestamp: str,
        nonce: str,
    ) -> HmacSignature:
        raise NotImplementedError

    @abstractmethod
    async def verify_request(
        self,
        method: str,
        path: str,
        body: bytes,
        timestamp: str,
        nonce: str,
        signature: str,
    ) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def sign_event(self, event_data: dict[str, Any]) -> EventSignature:
        raise NotImplementedError

    @abstractmethod
    async def verify_event(self, event_envelope: dict[str, Any]) -> bool:
        raise NotImplementedError
