from typing import Optional

from fastapi import Header

from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.core.jwt_auth import extract_bearer, verify_token


async def get_current_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """Verify Bearer JWT (RS256, Keycloak) và trả về 'sub'.

    Không còn tin header X-User-Id thô (C-01/C-02): danh tính chỉ đến từ
    JWT đã verify chữ ký.
    """
    token = extract_bearer(authorization)
    claims = await verify_token(token)
    sub = claims.get("sub")
    if not sub:
        raise UnauthorizedException("Token missing 'sub' claim.")
    return sub


async def verify_internal_token(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
) -> None:
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise UnauthorizedException("Invalid internal token.")
