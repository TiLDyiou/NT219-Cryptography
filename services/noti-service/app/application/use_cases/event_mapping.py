from dataclasses import dataclass
from typing import Any

from app.application.use_cases.send_notification import SendNotificationCommand


@dataclass(frozen=True)
class EventRoute:
    template_code: str
    category: str
    priority: str = "normal"
    reference_type: str | None = None


def _email(payload: dict[str, Any]) -> str | None:
    return payload.get("email") or payload.get("customer_email") or payload.get("user_email")


def command_from_order_event(envelope: dict[str, Any]) -> SendNotificationCommand | None:
    payload = envelope.get("payload", {})
    event_type = envelope.get("event_type")
    to_status = payload.get("to_status")
    route = None
    if event_type == "order.status_changed" and to_status == "confirmed":
        route = EventRoute("order_confirmed", "order", reference_type="order")
    elif event_type == "order.status_changed" and to_status == "payment_failed":
        route = EventRoute("payment_failed", "payment", "high", "order")
    elif event_type == "order.status_changed" and to_status == "cancelled":
        route = EventRoute("order_cancelled", "order", reference_type="order")
    if route is None:
        return None
    return _build_command(payload, route, payload.get("order_id") or envelope.get("aggregate_id"))


def command_from_payment_event(envelope: dict[str, Any]) -> SendNotificationCommand | None:
    payload = envelope.get("payload", {})
    event_type = envelope.get("event_type")
    route = None
    if event_type == "PaymentCompleted":
        route = EventRoute("payment_received", "payment", reference_type="payment")
    elif event_type == "PaymentFailed":
        route = EventRoute("payment_failed", "payment", "high", "payment")
    elif event_type == "RefundCompleted":
        route = EventRoute("refund_processed", "payment", reference_type="payment")
    if route is None:
        return None
    return _build_command(payload, route, payload.get("payment_id") or envelope.get("aggregate_id"))


def command_from_shipping_event(envelope: dict[str, Any]) -> SendNotificationCommand | None:
    payload = envelope.get("payload", {})
    event_type = envelope.get("event_type")
    route = None
    if event_type == "shipping.created":
        route = EventRoute("shipment_created", "shipping", reference_type="shipment")
    elif event_type == "shipping.tracking_recorded" and payload.get("status") == "delivered":
        route = EventRoute("shipment_delivered", "shipping", reference_type="shipment")
    if route is None:
        return None
    return _build_command(payload, route, payload.get("shipment_id") or envelope.get("aggregate_id"))


def _build_command(payload: dict[str, Any], route: EventRoute, reference_id: str | None) -> SendNotificationCommand | None:
    recipient_email = _email(payload)
    user_id = payload.get("user_id")
    if not user_id or not recipient_email:
        return None
    return SendNotificationCommand(
        user_id=user_id,
        recipient_email=recipient_email,
        template_code=route.template_code,
        category=route.category,
        variables=payload,
        reference_type=route.reference_type,
        reference_id=reference_id,
        priority=route.priority,
        metadata={"source": "kafka"},
    )
