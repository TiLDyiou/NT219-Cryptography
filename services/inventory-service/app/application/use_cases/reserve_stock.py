import hashlib
import json
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import OutOfStockException
from app.domain.events import InventoryReserved
from app.domain.ports.idempotency_store import IdempotencyClaimStatus, IdempotencyStore
from app.domain.ports.outbox_repository import OutboxRepository
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.persistence.repositories.inventory_repository import InventoryRepository
from app.infrastructure.observability.metrics import (
    inventory_out_of_stock_total,
    inventory_reserve_total,
    optimistic_lock_conflict_total,
)

logger = logging.getLogger(__name__)


class ReserveStockUseCase:
    def __init__(
        self,
        repository: InventoryRepository,
        idempotency_store: IdempotencyStore,
        outbox_repository: OutboxRepository,
        audit_logger: KafkaAuditLogger,
        session: AsyncSession,
    ):
        self._repo = repository
        self._idemp = idempotency_store
        self._outbox = outbox_repository
        self._audit = audit_logger
        self._session = session

    async def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        order_id = payload["order_id"]
        idempotency_key = payload["idempotency_key"]
        saga_id = payload.get("saga_id")
        correlation_id = payload.get("correlation_id")
        items = payload.get("items", [])

        raw_payload = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        payload_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

        claim_status, cached = await self._idemp.claim_or_wait(
            user_id=order_id, key=idempotency_key, request_hash=payload_hash
        )
        if claim_status == IdempotencyClaimStatus.CACHED and cached:
            inventory_reserve_total.labels(status="cached").inc()
            return cached

        reservations: list[dict[str, Any]] = []

        try:
            for line in items:
                product_id = line["product_id"]
                variant_id = line.get("variant_id")
                merchant_id = line["merchant_id"]
                quantity = int(line["quantity"])

                if not await self._repo.has_trackable_inventory(
                    self._session,
                    product_id=product_id,
                    variant_id=variant_id,
                    merchant_id=merchant_id,
                ):
                    continue

                item = await self._repo.select_item_for_reserve(
                    self._session,
                    product_id=product_id,
                    variant_id=variant_id,
                    merchant_id=merchant_id,
                    quantity=quantity,
                )
                if not item:
                    inventory_out_of_stock_total.inc()
                    inventory_reserve_total.labels(status="out_of_stock").inc()
                    raise OutOfStockException(product_id, line.get("sku"))

                try:
                    item = await self._repo.reserve_quantity(
                        self._session, item, quantity
                    )
                except Exception as exc:
                    if getattr(exc, "error_code", "") == "OPTIMISTIC_LOCK_ERROR":
                        optimistic_lock_conflict_total.inc()
                    raise

                reservation = await self._repo.create_reservation(
                    self._session,
                    inventory_item_id=item.id,
                    order_id=order_id,
                    saga_id=saga_id,
                    quantity=quantity,
                )

                await self._audit.log_change(
                    session=self._session,
                    table_name="inventory_items",
                    record_id=item.id,
                    action="UPDATE",
                    old_data=None,
                    new_data={
                        "quantity_reserved": item.quantity_reserved,
                        "order_id": order_id,
                    },
                    actor_type="system",
                    correlation_id=correlation_id,
                )

                reservations.append(
                    {
                        "id": reservation.id,
                        "inventory_item_id": item.id,
                        "quantity": quantity,
                        "warehouse_id": item.warehouse_id,
                        "expires_at": reservation.expires_at.isoformat(),
                    }
                )

            event = InventoryReserved(order_id=order_id, reservations=reservations)
            await self._outbox.save_event(
                aggregate_type="inventory",
                aggregate_id=order_id,
                event_type="inventory.reserved",
                payload=event.to_dict(),
                session=self._session,
            )

            response = event.to_dict()
            await self._session.commit()
            await self._idemp.save_response(
                user_id=order_id,
                key=idempotency_key,
                request_hash=payload_hash,
                response=response,
            )
            inventory_reserve_total.labels(status="success").inc()
            return response

        except OutOfStockException:
            await self._session.rollback()
            raise
        except Exception:
            await self._session.rollback()
            inventory_reserve_total.labels(status="error").inc()
            raise
