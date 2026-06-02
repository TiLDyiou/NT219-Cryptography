import logging
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_correlation_id,
    get_current_user_id,
    get_db,
)
from app.infrastructure.container import get_container
from app.application.use_cases.merchant_order import (
    ListMerchantOrdersUseCase,
    ConfirmOrderUseCase,
)
from app.schemas.order import OrderSummaryResponse, OrderItemResponse
from app.schemas.response import APIResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def get_list_merchant_orders_use_case(db: AsyncSession = Depends(get_db)) -> ListMerchantOrdersUseCase:
    return get_container().list_merchant_orders_use_case(db)


def get_confirm_order_use_case(db: AsyncSession = Depends(get_db)) -> ConfirmOrderUseCase:
    return get_container().confirm_order_use_case(db)


@router.get("", response_model=APIResponse[List[OrderSummaryResponse]])
async def list_merchant_orders(
    use_case: ListMerchantOrdersUseCase = Depends(get_list_merchant_orders_use_case),
    merchant_id: str = Depends(get_current_user_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    orders = await use_case.execute(merchant_id)
    return APIResponse(
        success=True,
        data=[
            OrderSummaryResponse(
                id=order.id,
                order_group_id=order.order_group_id,
                parent_order_id=order.parent_order_id,
                order_number=order.order_number,
                user_id=order.user_id,
                merchant_id=order.merchant_id or "",
                status=order.status.value,
                subtotal=order.subtotal,
                shipping_fee=order.shipping_fee,
                total_amount=order.total_amount,
                item_count=order.item_count,
                payment_method_type=order.payment_method_type,
                fraud_status=order.fraud_status,
                created_at=order.created_at,
                items=[
                    OrderItemResponse(
                        id=item.id,
                        product_id=item.product_id,
                        variant_id=item.variant_id,
                        merchant_id=item.merchant_id,
                        sku=item.sku,
                        product_name=item.product_name,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        line_total=item.line_total,
                        status=item.status,
                    )
                    for item in order.items
                ],
            )
            for order in orders
        ],
        correlation_id=correlation_id,
    )


@router.post("/{order_id}/confirm", response_model=APIResponse[OrderSummaryResponse])
async def confirm_order(
    order_id: str,
    use_case: ConfirmOrderUseCase = Depends(get_confirm_order_use_case),
    merchant_id: str = Depends(get_current_user_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    order = await use_case.execute(merchant_id, order_id, correlation_id)
    result = OrderSummaryResponse(
        id=order.id,
        order_group_id=order.order_group_id,
        parent_order_id=order.parent_order_id,
        order_number=order.order_number,
        user_id=order.user_id,
        merchant_id=order.merchant_id or "",
        status=order.status.value,
        subtotal=order.subtotal,
        shipping_fee=order.shipping_fee,
        total_amount=order.total_amount,
        item_count=order.item_count,
        payment_method_type=order.payment_method_type,
        fraud_status=order.fraud_status,
        created_at=order.created_at,
        items=[
            OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                merchant_id=item.merchant_id,
                sku=item.sku,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
                status=item.status,
            )
            for item in order.items
        ],
    )
    return APIResponse(success=True, data=result, correlation_id=correlation_id)
