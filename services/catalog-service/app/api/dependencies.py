from fastapi import Depends, HTTPException, status, Header
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

async def get_current_merchant_id(
    authorization: Optional[str] = Header(None, description="Mock JWT Token as `Bearer merchant_id_here`")
) -> str:
    """
    Mock dependency để verify JWT và RLS.
    Thực tế Gateway sẽ bắn \`X-User-Id\` và \`X-User-Role\` vào Header.
    Ở đây, ta mock: token chỉ là chuỗi "Bearer {merchant_id}".
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ")[1]
    
    # Mock RLS check: Giả vờ token chính là merchant_id
    merchant_id = token 
    
    if not merchant_id or merchant_id == "admin" or merchant_id == 'user':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role 'merchant' required for this operation."
        )
    return merchant_id

async def get_db_session() -> AsyncSession:
    # Generator dependency cannot be easily yielded in another regular func, FastAPI supports Depends(get_db)
    pass
