from typing import Optional
from fastapi import Header
from app.core.exceptions import UnauthorizedException
from app.infrastructure.persistence.database import get_db

__all__ = ["get_db", "get_idempotency_key", "get_correlation_id", "get_current_user_id"]


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


async def get_current_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> str:
    if not x_user_id:
        raise UnauthorizedException("Missing X-User-Id header.")
    return x_user_id
