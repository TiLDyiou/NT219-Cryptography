from app.application.dto.checkout_dto import CheckoutContext, SagaStepResult
from app.domain.entities.order_item import OrderEntity
from app.domain.ports.payment_gateway import PaymentRefundRequest


class ReleaseInventoryStep:
    async def compensate(self, order: OrderEntity, ctx: CheckoutContext) -> SagaStepResult:
        return SagaStepResult(success=True, data={"released": True, "order_id": order.id})


class RefundPaymentStep:
    def __init__(self, payment_gateway):
        self._payment = payment_gateway

    async def compensate(
        self, order: OrderEntity, ctx: CheckoutContext, payment_id: str | None
    ) -> SagaStepResult:
        if not payment_id or order.payment_method_type == "cod":
            return SagaStepResult(success=True, data={"skipped": True})

        try:
            result = await self._payment.refund(
                PaymentRefundRequest(
                    payment_id=payment_id,
                    order_id=order.id,
                    amount=order.total_amount,
                    reason="checkout_saga_compensation",
                )
            )
            return SagaStepResult(
                success=result.status in {"succeeded", "processing", "pending"},
                data={"refund_id": result.refund_id, "status": result.status},
            )
        except Exception as exc:
            return SagaStepResult(success=False, error=str(exc), retryable=True)
