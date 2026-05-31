import json
import base64
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


def _decode_jwt_sub(token: str) -> str:
    """Decode JWT payload (không verify signature vì gateway đã verify)
    và trả về claim 'sub' — ID cố định của merchant trong Keycloak."""
    try:
        payload_b64 = token.split(".")[1]
        # Thêm padding cho base64
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        sub = payload.get("sub")
        if sub:
            return sub
    except Exception:
        pass
    raise UnauthorizedException("Invalid token: cannot extract merchant identity.")


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
            return _decode_jwt_sub(token)
    raise UnauthorizedException("Could not validate merchant identity.")


async def verify_internal_token(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
) -> None:
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise UnauthorizedException("Invalid internal token.")
