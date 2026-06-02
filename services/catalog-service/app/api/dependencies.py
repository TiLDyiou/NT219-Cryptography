import time
import logging
from typing import Optional

import httpx
from fastapi import HTTPException, status, Header
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import get_db  # re-export cho các module khác dùng

__all__ = ["get_current_merchant_id", "get_db"]

logger = logging.getLogger(__name__)

# Cache public key — refresh mỗi 1 giờ
_pubkey_cache: dict = {"pem": None, "expires_at": 0.0}


async def _get_public_key() -> str:
    """Lấy RSA public key từ Keycloak realm endpoint, cache 1 giờ."""
    now = time.time()
    if _pubkey_cache["pem"] and now < _pubkey_cache["expires_at"]:
        return _pubkey_cache["pem"]

    realm_url = f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(realm_url)
            resp.raise_for_status()
            raw_key = resp.json()["public_key"]
            # Bọc thành định dạng PEM chuẩn để python-jose đọc được
            pem = f"-----BEGIN PUBLIC KEY-----\n{raw_key}\n-----END PUBLIC KEY-----"
            _pubkey_cache["pem"] = pem
            _pubkey_cache["expires_at"] = now + 3600
            return pem
    except Exception as exc:
        logger.error("Failed to fetch Keycloak public key: %s", exc)
        if _pubkey_cache["pem"]:
            return _pubkey_cache["pem"]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )


async def get_current_merchant_id(
    authorization: Optional[str] = Header(None, description="Bearer JWT từ Keycloak"),
) -> str:
    """
    Verify JWT signature với RSA public key từ Keycloak,
    trả về merchant_id (= sub claim).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()

    try:
        public_key = await _get_public_key()
        issuer = f"{settings.KEYCLOAK_URL.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}"
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience="account",
            # H-05: ràng buộc issuer để token từ realm/issuer khác không dùng được.
            issuer=issuer,
        )
    except JWTError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unexpected error during JWT validation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    merchant_id: str = payload.get("sub", "")
    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token missing 'sub' claim",
        )

    return merchant_id
