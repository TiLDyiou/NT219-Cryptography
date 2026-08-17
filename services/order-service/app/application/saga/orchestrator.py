import logging

from app.application.dto.checkout_dto import CheckoutContext
from app.application.saga.compensations import RefundPaymentStep, ReleaseInventoryStep
from app.application.saga.steps import (
    ConfirmOrderStep,
    FraudCheckStep,
    ProcessPaymentStep,
    ReserveInventoryStep,
)
from app.domain.entities.order_item import OrderEntity
from app.domain.entities.saga import SagaStateEntity, SagaStatus
from app.domain.events import order_status_changed
from app.domain.ports.event_publisher import EventPublisher
from app.domain.ports.inventory_gateway import InventoryConfirmRequest, InventoryGateway
from app.domain.ports.order_repository import OrderRepository
from app.domain.ports.payment_gateway import PaymentGateway
from app.domain.value_objects.order_status import OrderStatus

logger = logging.getLogger(__name__)


class CheckoutSagaOrchestrator:
    def __init__(
        self,
        order_repository: OrderRepository,
        payment_gateway: PaymentGateway,
        inventory_gateway: InventoryGateway,
        event_publisher: EventPublisher,
    ):
        self._orders = order_repository
        self._events = event_publisher
        self._inventory = inventory_gateway
        self._steps = {
            "reserve_inventory": ReserveInventoryStep(inventory_gateway),
            "fraud_check": FraudCheckStep(),
            "process_payment": ProcessPaymentStep(payment_gateway),
            "confirm_order": ConfirmOrderStep(),
        }
        self._compensations = {
            "release_inventory": ReleaseInventoryStep(inventory_gateway),
            "refund_payment": RefundPaymentStep(payment_gateway),
        }

    async def run(
        self, order: OrderEntity, saga: SagaStateEntity, ctx: CheckoutContext
    ) -> SagaStateEntity:
        payment_id: str | None = None
        completed_steps: list[str] = []

        for step_name in list(saga.steps_remaining):
            handler = self._steps[step_name]
            result = await handler.execute(order, ctx)

            if not result.success:
                logger.warning(
                    "Saga step failed",
                    extra={"order_id": order.id, "step": step_name, "error": result.error},
                )
                saga.fail({"step": step_name, "error": result.error})
                await self._orders.update_saga(saga)
                await self._compensate(order, saga, ctx, completed_steps, payment_id)
                order.transition_to(OrderStatus.PAYMENT_FAILED)
                await self._orders.update_order(order)
                return saga

            saga.mark_step_completed(step_name)
            completed_steps.append(step_name)

            if step_name == "process_payment" and result.data:
                payment_id = result.data.get("payment_id")
                if payment_id:
                    order.payment_id = payment_id

            if step_name == "fraud_check" and result.data:
                order.fraud_status = result.data.get("fraud_status", "approved")

            if step_name == "confirm_order":
                old_status = OrderStatus.PAYMENT_PROCESSING.value
                await self._orders.update_order(order)
                await self._events.publish(
                    order_status_changed(
                        order_id=order.id,
                        from_status=old_status,
                        to_status=OrderStatus.CONFIRMED.value,
                        actor_id="system",
                        actor_type="system",
                    )
                )

            await self._orders.update_saga(saga)

        saga.complete()
        await self._orders.update_saga(saga)

        if "reserve_inventory" in completed_steps:
            try:
                await self._inventory.confirm(
                    InventoryConfirmRequest(
                        order_id=order.id,
                        saga_id=saga.id,
                    )
                )
            except Exception:
                logger.exception(
                    "Failed to confirm inventory after saga completion",
                    extra={"order_id": order.id},
                )

        return saga

    async def _compensate(
        self,
        order: OrderEntity,
        saga: SagaStateEntity,
        ctx: CheckoutContext,
        completed_steps: list[str],
        payment_id: str | None,
    ) -> None:
        saga.start_compensation()
        await self._orders.update_saga(saga)

        if "process_payment" in completed_steps:
            refund = await self._compensations["refund_payment"].compensate(
                order, ctx, payment_id
            )
            saga.log_compensation("refund_payment", refund.data or {"error": refund.error})

        if "reserve_inventory" in completed_steps:
            release = await self._compensations["release_inventory"].compensate(order, ctx)
            saga.log_compensation(
                "release_inventory", release.data or {"error": release.error}
            )

        saga.status = SagaStatus.COMPENSATED
        await self._orders.update_saga(saga)
