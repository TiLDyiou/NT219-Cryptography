from app.application.dto.checkout_dto import CheckoutContext, SagaStepResult
from app.domain.entities.order_item import OrderEntity
from app.domain.entities.saga import SagaStateEntity, SagaStatus
from app.domain.ports.order_repository import OrderRepository
from app.domain.ports.payment_gateway import PaymentChargeRequest


class ReserveInventoryStep:
    async def execute(self, order: OrderEntity, ctx: CheckoutContext) -> SagaStepResult:
        # Inventory reservation is async via catalog-service; dev stub succeeds immediately.
        return SagaStepResult(success=True, data={"reserved": True, "order_id": order.id})


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
