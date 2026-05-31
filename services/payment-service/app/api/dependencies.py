import base64
import json
from typing import Optional
from fastapi import Header
from app.core.exceptions import UnauthorizedException
from app.infrastructure.persistence.database import get_db

__all__ = ["get_db", "get_idempotency_key", "get_correlation_id", "get_current_user_id", "get_current_user_id_from_jwt"]


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


def _decode_jwt_sub(token: str) -> str:
    """Decode JWT payload (Envoy already verified signature) and return 'sub' claim."""
    try:
        payload_b64 = token.split(".")[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        sub = payload.get("sub")
        if sub:
            return sub
    except Exception:
        pass
    raise UnauthorizedException("Invalid Bearer token: cannot extract user identity.")


async def get_current_user_id_from_jwt(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """Extract user ID from Bearer JWT. Does NOT fall back to X-User-Id (T1 mitigation)."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return _decode_jwt_sub(token)
    raise UnauthorizedException("Missing or invalid Authorization header.")
