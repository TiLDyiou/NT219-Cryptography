from typing import Optional
from fastapi import Header
from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.infrastructure.persistence.database import get_db

__all__ = [
    "get_db",
    "get_idempotency_key",
    "get_correlation_id",
    "get_current_user_id",
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


async def get_current_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> str:
    """ID người dùng do service gọi (order) truyền vào.

    Payment KHÔNG có endpoint hướng tới trình duyệt: mọi route dùng hàm này
    nằm dưới /internal/ và được bảo vệ bằng HMAC + verify_internal_token
    (xem dependencies của router). Vì vậy X-User-Id ở đây là *ngữ cảnh tin cậy*
    được truyền từ caller đã xác thực, không phải header thô từ client.
    Đã gỡ bỏ hàm decode-JWT-không-verify (C-02).
    """
    if not x_user_id:
        raise UnauthorizedException("Missing X-User-Id header.")
    return x_user_id


async def verify_internal_token(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
) -> None:
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise UnauthorizedException("Invalid internal token.")
