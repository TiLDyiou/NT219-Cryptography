from app.domain.entities.order_item import OrderEntity
from app.domain.ports.audit_logger import AuditEvent, AuditLogger
from app.domain.ports.event_publisher import EventPublisher
from app.domain.ports.order_repository import OrderRepository
from app.domain.value_objects.order_status import OrderStatus
from app.domain.events import order_status_changed


class ListMerchantOrdersUseCase:
    def __init__(self, order_repository: OrderRepository):
        self._orders = order_repository

    async def execute(self, merchant_id: str) -> list[OrderEntity]:
        return await self._orders.list_merchant_orders(merchant_id)


class ConfirmOrderUseCase:
    def __init__(
        self,
        order_repository: OrderRepository,
        event_publisher: EventPublisher,
        audit_logger: AuditLogger,
    ):
        self._orders = order_repository
        self._events = event_publisher
        self._audit = audit_logger

    async def execute(
        self,
        merchant_id: str,
        order_id: str,
        correlation_id: str | None = None,
    ) -> OrderEntity:
        order = await self._orders.get_merchant_order(merchant_id, order_id)

        from app.core.exceptions import BusinessRuleException

        # Determine if order can be confirmed
        if order.status not in (OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_PROCESSING, OrderStatus.CONFIRMED):
            raise BusinessRuleException(f"Cannot confirm order in status: {order.status.value}")

        # Even if confirmed already, we can be idempotent or just return. Let's do a strict transition.
        old_status = order.status.value
        if order.status != OrderStatus.CONFIRMED:
            order.transition_to(OrderStatus.CONFIRMED)
            updated = await self._orders.update_order(order)

            await self._events.publish(
                order_status_changed(
                    order_id=order.id,
                    from_status=old_status,
                    to_status=OrderStatus.CONFIRMED.value,
                    actor_id=merchant_id,
                    actor_type="merchant",
                )
            )
            await self._audit.log(
                AuditEvent(
                    table_name="orders",
                    record_id=order.id,
                    action="UPDATE",
                    old_data={"status": old_status},
                    new_data={"status": OrderStatus.CONFIRMED.value},
                    changed_fields=["status"],
                    actor_id=merchant_id,
                    actor_type="merchant",
                    correlation_id=correlation_id,
                )
            )
            return updated
        return order
