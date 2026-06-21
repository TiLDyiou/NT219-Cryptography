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

# Cache JWKS (tập khóa công khai của Keycloak) — refresh mỗi 1 giờ.
# Dùng JWKS thay vì field `public_key` của realm (chỉ chứa khóa RSA) để hỗ trợ
# khóa EC dùng cho ES256 (EC-SHA256) — thuật toán ký JWT của hệ thống.
_jwks_cache: dict = {"keys": None, "expires_at": 0.0}

# Thuật toán ký JWT được CHẤP NHẬN. Hệ thống ký bằng ES256 (EC-SHA256);
# vẫn chấp nhận RS256 để tương thích ngược trong giai đoạn xoay khóa.
_ALLOWED_ALGS = ["ES256", "RS256"]


async def _get_jwks() -> list[dict]:
    """Lấy JWKS từ Keycloak realm, cache 1 giờ."""
    now = time.time()
    if _jwks_cache["keys"] and now < _jwks_cache["expires_at"]:
        return _jwks_cache["keys"]

    realm_url = f"{settings.KEYCLOAK_URL.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}"
    jwks_url = f"{realm_url}/protocol/openid-connect/certs"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(jwks_url)
            resp.raise_for_status()
            keys = resp.json()["keys"]
            _jwks_cache["keys"] = keys
            _jwks_cache["expires_at"] = now + 3600
            return keys
    except Exception as exc:
        logger.error("Failed to fetch Keycloak JWKS: %s", exc)
        if _jwks_cache["keys"]:
            return _jwks_cache["keys"]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )


def _select_key(keys: list[dict], kid: str) -> dict:
    """Chọn JWK theo `kid` trong header của token."""
    for k in keys:
        if k.get("kid") == kid:
            return k
    raise JWTError(f"No matching JWKS key for kid={kid!r}")


async def get_current_merchant_id(
    authorization: Optional[str] = Header(None, description="Bearer JWT từ Keycloak"),
) -> str:
    """
    Verify chữ ký JWT bằng khóa công khai (JWKS) của Keycloak — chấp nhận ES256/RS256,
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
        keys = await _get_jwks()
        # Chọn đúng khóa theo `kid`; KHÔNG tin `alg` do client cung cấp một cách mù quáng.
        unverified_header = jwt.get_unverified_header(token)
        key = _select_key(keys, unverified_header.get("kid", ""))

        issuer = f"{settings.KEYCLOAK_URL.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}"
        payload = jwt.decode(
            token,
            key,                       # JWK dict (EC cho ES256, hoặc RSA cho RS256)
            algorithms=_ALLOWED_ALGS,  # CHỐT CỨNG ES256/RS256 → chống alg:none / algorithm confusion
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
