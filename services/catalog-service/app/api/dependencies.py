from fastapi import Depends, HTTPException, status, Header
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

async def get_current_merchant_id(
    authorization: Optional[str] = Header(None, description="Bearer JWT from Keycloak")
) -> str:
    """
    Trích xuất merchant_id (= sub claim) từ JWT.
    Signature đã được Envoy verify trước khi tới đây,
    nên chỉ cần decode payload để lấy claims.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ")[1]

    # Decode JWT payload (phần thứ 2, base64url-encoded)
    import base64, json
    try:
        payload_b64 = token.split(".")[1]
        # Thêm padding cho base64
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload_b64))
        merchant_id = claims.get("sub", "")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
        )

    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token missing 'sub' claim",
        )
    return merchant_id

async def get_db_session() -> AsyncSession:
    # Generator dependency cannot be easily yielded in another regular func, FastAPI supports Depends(get_db)
    pass
