from app.application.dto.checkout_dto import CheckoutContext, SagaStepResult
from app.domain.entities.order_item import OrderEntity
from app.domain.ports.inventory_gateway import InventoryReserveRequest


class ReserveInventoryStep:
    def __init__(self, inventory_gateway):
        self._inventory = inventory_gateway

    async def execute(self, order: OrderEntity, ctx: CheckoutContext) -> SagaStepResult:
        try:
            if order.items:
                source_items = order.items
                items = [
                    {
                        "product_id": item.product_id,
                        "variant_id": item.variant_id,
                        "merchant_id": item.merchant_id,
                        "sku": item.sku,
                        "quantity": item.quantity,
                    }
                    for item in source_items
                ]
            else:
                merchant_id = order.merchant_id
                items = [
                    {
                        "product_id": item.product_id,
                        "variant_id": item.variant_id,
                        "merchant_id": item.merchant_id,
                        "sku": item.sku,
                        "quantity": item.quantity,
                    }
                    for item in ctx.payload.items
                    if not merchant_id or item.merchant_id == merchant_id
                ]
            result = await self._inventory.reserve(
                InventoryReserveRequest(
                    order_id=order.id,
                    saga_id=getattr(order, "saga_id", None),
                    idempotency_key=ctx.idempotency_key,
                    items=items,
                    correlation_id=ctx.correlation_id,
                )
            )
            return SagaStepResult(
                success=True,
                data={
                    "reserved": result.reserved,
                    "order_id": result.order_id,
                    "reservations": result.reservations,
                },
            )
        except Exception as exc:
            return SagaStepResult(success=False, error=str(exc), retryable=True)


class FraudCheckStep:
    async def execute(self, order: OrderEntity, ctx: CheckoutContext) -> SagaStepResult:
        # Stateless fraud scoring would arrive via Kafka; auto-approve in orchestrator path.
        return SagaStepResult(success=True, data={"fraud_status": "approved", "score": "0.0100"})


class ProcessPaymentStep:
    def __init__(self, payment_gateway):
        self._payment = payment_gateway

    async def execute(self, order: OrderEntity, ctx: CheckoutContext) -> SagaStepResult:
        if order.payment_method_type == "cod":
            return SagaStepResult(success=True, data={"skipped": True})

        try:
            result = await self._payment.charge(
                PaymentChargeRequest(
                    order_id=order.id,
                    user_id=order.user_id,
                    amount=order.total_amount,
                    payment_method_type=order.payment_method_type or "",
                    idempotency_key=ctx.idempotency_key,
                )
            )
            if result.status not in {"succeeded", "processing", "authorized"}:
                return SagaStepResult(
                    success=False,
                    error=f"Payment declined: {result.status}",
                    retryable=False,
                )
            return SagaStepResult(
                success=True,
                data={"payment_id": result.payment_id, "status": result.status},
            )
        except Exception as exc:
            return SagaStepResult(success=False, error=str(exc), retryable=True)


class ConfirmOrderStep:
    async def execute(self, order: OrderEntity, ctx: CheckoutContext) -> SagaStepResult:
        from app.domain.value_objects.order_status import OrderStatus

        order.transition_to(OrderStatus.CONFIRMED)
        return SagaStepResult(success=True, data={"status": OrderStatus.CONFIRMED.value})
