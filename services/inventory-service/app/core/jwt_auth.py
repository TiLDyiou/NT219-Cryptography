"""Xác minh JWT Keycloak (RS256) — thay cho việc tin header thô (X-User-Id...).

Service tự lấy RSA public key từ Keycloak realm endpoint (cache 1 giờ), rồi
verify chữ ký RS256 + hạn dùng (exp) + issuer. Đây là cùng mô hình mà
catalog-service đã dùng; nhân rộng để đóng lỗ hổng mạo danh danh tính
(C-01/C-02 trong SERVICES_CODEBASE_REVIEW.md).
"""
import logging
import time
from typing import Any, Dict, Optional, Set

import httpx
from jose import jwt, JWTError

from app.core.config import settings
from app.core.exceptions import UnauthorizedException

logger = logging.getLogger(__name__)

# Cache JWKS — refresh mỗi 1 giờ. Dùng JWKS thay vì field `public_key` (chỉ RSA)
# để hỗ trợ khóa EC cho ES256 (EC-SHA256) — thuật toán ký JWT của hệ thống.
_jwks_cache: dict = {"keys": None, "expires_at": 0.0}

# Hệ thống ký JWT bằng ES256 (EC-SHA256); chấp nhận thêm RS256 để tương thích xoay khóa.
_ALLOWED_ALGS = ["ES256", "RS256"]


def _issuer() -> str:
    return f"{settings.KEYCLOAK_URL.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}"


async def _get_jwks() -> list:
    """Lấy JWKS của realm từ Keycloak, cache 1 giờ."""
    now = time.time()
    if _jwks_cache["keys"] and now < _jwks_cache["expires_at"]:
        return _jwks_cache["keys"]

    jwks_url = f"{_issuer()}/protocol/openid-connect/certs"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(jwks_url)
            resp.raise_for_status()
            keys = resp.json()["keys"]
    except Exception as exc:  # noqa: BLE001 - mạng/parsing đều coi như không xác thực được
        logger.error("Không lấy được JWKS từ Keycloak: %s", exc)
        if _jwks_cache["keys"]:
            # Dùng key cũ còn cache để không chết toàn bộ khi Keycloak chớp tắt.
            return _jwks_cache["keys"]
        raise UnauthorizedException("Authentication service unavailable.")

    _jwks_cache["keys"] = keys
    _jwks_cache["expires_at"] = now + 3600
    return keys


def _select_key(keys: list, kid: str) -> dict:
    """Chọn JWK theo `kid` trong header token."""
    for k in keys:
        if k.get("kid") == kid:
            return k
    raise JWTError(f"No matching JWKS key for kid={kid!r}")


async def verify_token(token: str) -> Dict[str, Any]:
    """Verify chữ ký ES256/RS256 + exp + issuer; trả claims hoặc raise UnauthorizedException."""
    keys = await _get_jwks()
    try:
        # Chọn khóa theo `kid`; KHÔNG tin `alg` do client cung cấp một cách mù quáng.
        kid = jwt.get_unverified_header(token).get("kid", "")
        key = _select_key(keys, kid)
        payload = jwt.decode(
            token,
            key,
            algorithms=_ALLOWED_ALGS,
            issuer=_issuer(),
            # aud của Keycloak thay đổi theo client; ta neo niềm tin vào iss + chữ ký.
            options={"verify_aud": False},
        )
    except JWTError as exc:
        logger.warning("JWT verify thất bại: %s", exc)
        raise UnauthorizedException("Invalid or expired token.")
    return payload


def extract_bearer(authorization: Optional[str]) -> str:
    """Tách token từ header 'Authorization: Bearer <jwt>'."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("Missing or invalid Authorization header.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise UnauthorizedException("Missing or invalid Authorization header.")
    return token


def realm_roles(claims: Dict[str, Any]) -> Set[str]:
    """Gom realm roles + client roles từ access token Keycloak."""
    roles: Set[str] = set((claims.get("realm_access") or {}).get("roles") or [])
    for client in (claims.get("resource_access") or {}).values():
        roles.update((client or {}).get("roles") or [])
    return roles
