from typing import Optional

from fastapi import Header

from app.core.config import settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.jwt_auth import extract_bearer, realm_roles, verify_token
from app.infrastructure.persistence.database import get_db

__all__ = [
    "get_db",
    "get_idempotency_key",
    "get_correlation_id",
    "get_current_merchant_id",
    "get_admin_user",
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
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """Verify Bearer JWT (RS256, Keycloak) và trả về 'sub' = merchant_id.

    Không còn tin header X-Merchant-Id thô (C-01/C-02).
    """
    token = extract_bearer(authorization)
    claims = await verify_token(token)
    sub = claims.get("sub")
    if not sub:
        raise UnauthorizedException("Token missing 'sub' claim.")
    return sub


async def get_admin_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """Verify JWT + yêu cầu role admin từ chính token (không tin X-Admin-Id/X-Admin-Scope).

    Trước đây admin được nhận diện qua header thô X-Admin-Id + X-Admin-Scope
    nên ai cũng tự xưng admin được (C-01/H-04). Giờ vai trò admin lấy từ
    realm/client roles của JWT đã verify chữ ký.
    """
    token = extract_bearer(authorization)
    claims = await verify_token(token)
    sub = claims.get("sub")
    if not sub:
        raise UnauthorizedException("Token missing 'sub' claim.")
    allowed = {r.strip() for r in settings.SHIPPING_ADMIN_ROLES.split(",") if r.strip()}
    if not (realm_roles(claims) & allowed):
        raise ForbiddenException("Admin role is required.")
    return sub


async def verify_internal_token(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
) -> None:
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise UnauthorizedException("Invalid internal token.")
