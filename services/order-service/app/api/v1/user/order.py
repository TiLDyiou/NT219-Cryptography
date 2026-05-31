import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Header
from cryptography.exceptions import InvalidTag

from app.api.dependencies import (
    bind_checkout_to_server_cart,
    build_checkout_context,
    clear_cart_on_server,
    get_checkout_use_case,
    get_correlation_id,
    get_crypto_service,
    get_current_user_id,
    get_get_order_use_case,
    get_idempotency_key,
    get_list_orders_use_case,
)
from app.domain.ports.crypto_service import CryptoService
from app.application.use_cases.checkout import (
    CheckoutUseCase,
    GetOrderUseCase,
    ListOrdersUseCase,
)
from app.schemas.order import (
    CheckoutOrderSummary,
    CheckoutRequest,
    CheckoutResponse,
    OrderAddressResponse,
    OrderItemResponse,
    OrderSummaryResponse,
)
from app.schemas.response import APIResponse

router = APIRouter()
logger = logging.getLogger(__name__)


async def _build_shipping_payload(
    order, crypto: CryptoService
) -> OrderAddressResponse | None:
    for addr in order.addresses:
        if addr.address_type != "shipping":
            continue
        try:
            return OrderAddressResponse(
                full_name=await crypto.decrypt_field(addr.encrypted.full_name),
                phone=await crypto.decrypt_field(addr.encrypted.phone),
                email=await crypto.decrypt_field(addr.encrypted.email),
                address_line1=await crypto.decrypt_field(addr.encrypted.address_line1),
                city=addr.city,
                state_province=addr.state_province,
                postal_code=addr.postal_code,
            )
        except Exception as exc:
            logger.warning(
                "Could not decrypt shipping address for order %s: %r",
                order.id,
                exc,
            )
            return None
    return None


@router.post("/checkout", response_model=APIResponse[CheckoutResponse])
async def checkout(
    payload: CheckoutRequest,
    use_case: CheckoutUseCase = Depends(get_checkout_use_case),
    user_id: str = Depends(get_current_user_id),
    idempotency_key: str = Depends(get_idempotency_key),
    correlation_id: Optional[str] = Depends(get_correlation_id),
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For"),
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
):
    payload = await bind_checkout_to_server_cart(payload, user_id)
    ctx = build_checkout_context(
        payload=payload,
        user_id=user_id,
        idempotency_key=idempotency_key,
        correlation_id=correlation_id,
        ip_address=x_forwarded_for,
        user_agent=user_agent,
    )
    result = await use_case.execute(ctx)

    # Mark cart as converted after successful order
    await clear_cart_on_server(payload.cart_id, user_id)

    response = CheckoutResponse(
        order_group_id=result.order_group_id,
        parent_order_number=result.parent_order_number,
        status=result.status,
        checkout_url=result.checkout_url,
        orders=[
            CheckoutOrderSummary(
                order_id=order.order_id,
                order_number=order.order_number,
                merchant_id=order.merchant_id,
                status=order.status,
                total_amount=order.total_amount,
            )
            for order in result.orders
        ],
    )
    return APIResponse(success=True, data=response, correlation_id=correlation_id)


@router.get("", response_model=APIResponse[List[OrderSummaryResponse]])
async def list_my_orders(
    use_case: ListOrdersUseCase = Depends(get_list_orders_use_case),
    user_id: str = Depends(get_current_user_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    orders = await use_case.execute(user_id)
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


@router.get("/{order_id}", response_model=APIResponse[OrderSummaryResponse])
async def get_my_order(
    order_id: str,
    use_case: GetOrderUseCase = Depends(get_get_order_use_case),
    crypto: CryptoService = Depends(get_crypto_service),
    user_id: str = Depends(get_current_user_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    order = await use_case.execute(user_id, order_id)
    shipping_payload = await _build_shipping_payload(order, crypto)

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
        shipping_address=shipping_payload,
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
