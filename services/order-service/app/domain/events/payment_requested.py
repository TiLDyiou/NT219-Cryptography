from app.domain.events.base import DomainEvent


def payment_requested(
    order_id: str,
    user_id: str,
    amount: str,
    payment_method_type: str,
    idempotency_key: str,
) -> DomainEvent:
    return DomainEvent.create(
        event_type="order.payment_requested",
        aggregate_id=order_id,
        payload={
            "user_id": user_id,
            "amount": amount,
            "payment_method_type": payment_method_type,
            "idempotency_key": idempotency_key,
        },
    )
