from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Tuple
from sqlalchemy import func

from app.crud.base import CRUDBase
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.core.exceptions import EntityNotFoundException, OptimisticLockException, RLSViolationException
from datetime import datetime

class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    
    async def get_by_merchant_and_id(self, db: AsyncSession, merchant_id: str, product_id: str) -> Optional[Product]:
        """Lấy product kết hợp kiểm tra quyền (RLS Mock)"""
        result = await db.execute(
            select(Product).filter(
                Product.id == product_id, 
                Product.merchant_id == merchant_id,
                Product.deleted_at.is_(None)
            )
        )
        return result.scalars().first()

    async def update_with_lock(self, db: AsyncSession, *, merchant_id: str, product_id: str, obj_in: ProductUpdate) -> Product:
        db_obj = await self.get(db, id=product_id)
        if not db_obj or db_obj.deleted_at is not None:
            raise EntityNotFoundException(entity="Product", id=product_id)
            
        if db_obj.merchant_id != merchant_id:
            raise RLSViolationException(actor_id=merchant_id, resource_id=product_id)
            
        if db_obj.version != obj_in.version:
            raise OptimisticLockException(expected_version=db_obj.version, current_version=obj_in.version)
            
        return await super().update(db, db_obj=db_obj, obj_in=obj_in)

    async def soft_delete(self, db: AsyncSession, *, merchant_id: str, product_id: str) -> Product:
        db_obj = await self.get(db, id=product_id)
        if not db_obj or db_obj.deleted_at is not None:
            raise EntityNotFoundException(entity="Product", id=product_id)
            
        if db_obj.merchant_id != merchant_id:
            raise RLSViolationException(actor_id=merchant_id, resource_id=product_id)
            
        db_obj.is_active = False
        db_obj.status = 'archived'
        db_obj.deleted_at = datetime.utcnow()
        db_obj.version += 1
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_public_list(self, db: AsyncSession, *, skip: int = 0, limit: int = 100, status: str = 'active') -> Tuple[List[Product], int]:
        query = select(Product).filter(Product.status == status, Product.is_active == True, Product.deleted_at.is_(None))
        count_query = select(func.count()).select_from(query.subquery())
        
        total = await db.scalar(count_query)
        result = await db.execute(query.offset(skip).limit(limit))
        return result.scalars().all(), total

product = CRUDProduct(Product)
