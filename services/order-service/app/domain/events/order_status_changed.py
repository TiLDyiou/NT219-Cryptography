from app.domain.events.base import DomainEvent


def order_status_changed(
    order_id: str,
    from_status: str | None,
    to_status: str,
    actor_id: str,
    actor_type: str,
) -> DomainEvent:
    return DomainEvent.create(
        event_type="order.status_changed",
        aggregate_id=order_id,
        payload={
            "from_status": from_status,
            "to_status": to_status,
            "actor_id": actor_id,
            "actor_type": actor_type,
        },
    )
