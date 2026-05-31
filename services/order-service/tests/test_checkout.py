import pytest
from decimal import Decimal
from uuid import uuid4

from app.application.dto.checkout_dto import (
    AddressDTO,
    CheckoutContext,
    CheckoutInput,
    CheckoutItemDTO,
)
from app.application.saga.orchestrator import CheckoutSagaOrchestrator
from app.application.use_cases.checkout import CheckoutUseCase
from app.domain.ports.audit_logger import AuditEvent, AuditLogger
from app.domain.ports.event_publisher import EventPublisher
from app.domain.ports.inventory_gateway import (
    InventoryConfirmRequest,
    InventoryGateway,
    InventoryReleaseRequest,
    InventoryReserveRequest,
    InventoryReserveResult,
)
from app.domain.ports.payment_gateway import (
    PaymentChargeRequest,
    PaymentChargeResult,
    PaymentGateway,
    PaymentRefundRequest,
    PaymentRefundResult,
)
from app.infrastructure.cache.redis_nonce_store import InMemoryNonceStore
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService
from app.infrastructure.persistence.database import AsyncSessionLocal, init_db
from app.infrastructure.persistence.repositories.pg_order_repository import PgOrderRepository


class MemoryAuditLogger(AuditLogger):
    def __init__(self):
        self.events: list[AuditEvent] = []

    async def log(self, event: AuditEvent) -> None:
        self.events.append(event)


class MemoryEventPublisher(EventPublisher):
    def __init__(self):
        self.published = []

    async def publish(self, event) -> None:
        self.published.append(event)

    async def verify_inbound(self, envelope: dict) -> bool:
        return True


class SuccessPaymentGateway(PaymentGateway):
    async def charge(self, request: PaymentChargeRequest) -> PaymentChargeResult:
        return PaymentChargeResult(
            payment_id="pay-123",
            status="processing",
            checkout_url="https://checkout.stripe.test/session",
        )

    async def refund(self, request: PaymentRefundRequest) -> PaymentRefundResult:
        return PaymentRefundResult(refund_id="ref-123", status="succeeded")


class SuccessInventoryGateway(InventoryGateway):
    async def reserve(self, request: InventoryReserveRequest) -> InventoryReserveResult:
        return InventoryReserveResult(
            reserved=True,
            order_id=request.order_id,
            reservations=[],
        )

    async def release(self, request: InventoryReleaseRequest) -> dict:
        return {"released": True, "order_id": request.order_id}

    async def confirm(self, request: InventoryConfirmRequest) -> dict:
        return {"confirmed": True, "order_id": request.order_id}


@pytest.fixture
async def checkout_use_case():
    await init_db()
    crypto = LocalDevCryptoService("integration-test-key")
    events = MemoryEventPublisher()
    audit = MemoryAuditLogger()
    payment = SuccessPaymentGateway()
    inventory = SuccessInventoryGateway()

    async with AsyncSessionLocal() as session:
        repo = PgOrderRepository(session)
        saga = CheckoutSagaOrchestrator(repo, payment, inventory, events)
        use_case = CheckoutUseCase(repo, crypto, events, audit, payment, saga)
        yield use_case, events, audit


@pytest.mark.asyncio
async def test_checkout_creates_child_orders(checkout_use_case):
    use_case, events, audit = checkout_use_case

    payload = CheckoutInput(
        cart_id="cart-1",
        payment_method_type="credit_card",
        shipping_fee=Decimal("30000"),
        customer_note="test",
        items=[
            CheckoutItemDTO(
                product_id="prod-1",
                variant_id=None,
                merchant_id="merchant-a",
                sku="SKU-1",
                product_name="Product A",
                variant_label=None,
                image_url=None,
                quantity=2,
                unit_price=Decimal("100000"),
            ),
            CheckoutItemDTO(
                product_id="prod-2",
                variant_id=None,
                merchant_id="merchant-b",
                sku="SKU-2",
                product_name="Product B",
                variant_label=None,
                image_url=None,
                quantity=1,
                unit_price=Decimal("50000"),
            ),
        ],
        shipping_address=AddressDTO(
            full_name="Test User",
            phone="0900000000",
            email="test@example.com",
            address_line1="123 Street",
            address_line2=None,
            city="Ho Chi Minh",
            state_province="HCM",
            postal_code="700000",
        ),
    )

    ctx = CheckoutContext(
        user_id="user-1",
        idempotency_key=f"idem-{uuid4()}",
        correlation_id="corr-1",
        ip_address="127.0.0.1",
        user_agent="pytest",
        payload=payload,
    )

    result = await use_case.execute(ctx)
    assert result.status == "payment_processing"
    assert result.checkout_url == "https://checkout.stripe.test/session"
    assert len(result.orders) == 2
    assert events.published
    assert audit.events


@pytest.mark.asyncio
async def test_nonce_store_rejects_replay():
    store = InMemoryNonceStore()
    assert await store.consume_nonce("nonce-1", 60) is True
    assert await store.consume_nonce("nonce-1", 60) is False
