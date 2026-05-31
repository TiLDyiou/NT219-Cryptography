import time
import logging
from typing import Optional

import httpx
from fastapi import HTTPException, status, Header
from jose import jwt, JWTError

from app.core.config import settings

logger = logging.getLogger(__name__)

# JWKS cache — refresh mỗi 1 giờ để tránh gọi Keycloak mỗi request
_jwks_cache: dict = {"keys": None, "expires_at": 0.0}


async def _get_jwks() -> dict:
    now = time.time()
    if _jwks_cache["keys"] and now < _jwks_cache["expires_at"]:
        return _jwks_cache["keys"]

    jwks_url = (
        f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
        "/protocol/openid-connect/certs"
    )
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(jwks_url)
            resp.raise_for_status()
            _jwks_cache["keys"] = resp.json()
            _jwks_cache["expires_at"] = now + 3600
            return _jwks_cache["keys"]
    except Exception as exc:
        logger.error("Failed to fetch JWKS from Keycloak: %s", exc)
        if _jwks_cache["keys"]:
            # Dùng cache cũ nếu Keycloak tạm thời không khả dụng
            return _jwks_cache["keys"]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )


async def get_current_merchant_id(
    authorization: Optional[str] = Header(None, description="Bearer JWT từ Keycloak"),
) -> str:
    """
    Verify JWT signature với RS256 public key từ Keycloak JWKS endpoint,
    rồi trả về merchant_id (= sub claim).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()

    try:
        jwks = await _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Keycloak không luôn set audience
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


