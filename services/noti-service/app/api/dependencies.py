import hmac
from typing import Optional

from fastapi import Header, HTTPException, status

from app.core.config import settings


async def require_admin_token(
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
) -> None:
    """C-09: API admin template (tạo/sửa template Jinja) trước đây KHÔNG có xác thực.

    HMAC middleware chỉ áp cho path chứa '/internal/' — mà các route admin không
    có '/internal/' nên hoàn toàn hở. Bắt buộc X-Admin-Token khớp ADMIN_API_TOKEN.
    """
    expected = settings.ADMIN_API_TOKEN
    if not x_admin_token or not hmac.compare_digest(x_admin_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin token.",
        )
