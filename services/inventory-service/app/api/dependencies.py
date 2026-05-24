from typing import Optional

from fastapi import Header

from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.infrastructure.persistence.database import get_db

__all__ = [
    "get_db",
    "get_idempotency_key",
    "get_correlation_id",
    "get_current_merchant_id",
    "verify_internal_token",
]


async def get_idempotency_key(
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
) -> str:
    if not idempotency_key:
        raise UnauthorizedException("Missing Idempotency-Key header.")
    return idempotency_key


async def get_correlation_id(
    x_correlation_id: Optional[str] = Header(None, alias="X-Correlation-Id"),
) -> Optional[str]:
    return x_correlation_id


async def get_current_merchant_id(
    x_merchant_id: Optional[str] = Header(None, alias="X-Merchant-Id"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    if x_merchant_id:
        return x_merchant_id
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return token
    raise UnauthorizedException("Could not validate merchant identity.")


async def verify_internal_token(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
) -> None:
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise UnauthorizedException("Invalid internal token.")
