from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.crud.base import CRUDBase
from app.models.merchant import Merchant
from app.schemas.merchant import MerchantCreate, MerchantUpdate

class CRUDMerchant(CRUDBase[Merchant, MerchantCreate, MerchantUpdate]):
    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[Merchant]:
        result = await db.execute(select(Merchant).filter(Merchant.code == code))
        return result.scalars().first()

merchant = CRUDMerchant(Merchant)
