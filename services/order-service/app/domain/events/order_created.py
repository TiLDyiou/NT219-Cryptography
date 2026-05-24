from app.domain.events.base import DomainEvent


def order_created(
    order_id: str,
    order_group_id: str,
    user_id: str,
    merchant_id: str | None,
    status: str,
    total_amount: str,
) -> DomainEvent:
    return DomainEvent.create(
        event_type="order.created",
        aggregate_id=order_id,
        payload={
            "order_group_id": order_group_id,
            "user_id": user_id,
            "merchant_id": merchant_id,
            "status": status,
            "total_amount": total_amount,
        },
    )
