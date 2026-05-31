from typing import Optional
import json
import base64

from fastapi import Header

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import UnauthorizedException


def _decode_jwt_sub(token: str) -> str:
    """Decode JWT payload (không verify signature vì gateway đã verify)
    và trả về claim 'sub' — ID cố định của user trong Keycloak."""
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
    raise UnauthorizedException("Invalid token: cannot extract user identity.")


async def get_current_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    if x_user_id:
        return x_user_id
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return _decode_jwt_sub(token)
    raise UnauthorizedException("Could not validate user identity.")


async def verify_internal_token(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
) -> None:
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise UnauthorizedException("Invalid internal token.")

