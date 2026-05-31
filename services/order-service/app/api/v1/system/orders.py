from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import verify_internal_token
from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.repositories.pg_order_repository import PgOrderRepository
from app.schemas.response import APIResponse

router = APIRouter()


@router.get("/orders/{order_id}", dependencies=[Depends(verify_internal_token)])
async def get_system_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Internal endpoint for payment-service to fetch order amount/owner.
    Protected by X-Internal-Token only — NOT exposed via public ingress.
    Returns minimal fields; no PII shipping address.
    """
    repo = PgOrderRepository(db)
    order = await repo.get_order_by_id(order_id)
    return APIResponse(
        success=True,
        data={
            "order_id": order.id,
            "user_id": order.user_id,
            "merchant_id": order.merchant_id,
            "total_amount": str(order.total_amount),
            "currency": "VND",
            "status": order.status.value,
        },
    )
