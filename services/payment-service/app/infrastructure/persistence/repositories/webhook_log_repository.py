from typing import Any
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.ports.webhook_log_repository import WebhookLogRepository
from app.infrastructure.persistence.models.psp_webhook_log import PspWebhookLogModel


class PgWebhookLogRepository(WebhookLogRepository):
    async def insert_if_new(
        self,
        event_id: str,
        psp_provider: str,
        payload: dict[str, Any],
        signature: str,
        session: Any = None,
    ) -> str | None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")

        dialect_name = session.bind.dialect.name

        if dialect_name == "postgresql":
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            
            stmt = (
                pg_insert(PspWebhookLogModel)
                .values(
                    psp_provider=psp_provider,
                    event_type=payload.get("type", "unknown"),
                    event_id=event_id,
                    payload=payload,
                    signature=signature,
                    is_verified=True,
                    is_processed=False,
                    received_at=datetime.now(timezone.utc),
                )
                .on_conflict_do_nothing(
                    constraint="uq_psp_webhook_event"
                )
                .returning(PspWebhookLogModel.id)
            )
            result = await session.execute(stmt)
            return result.scalar()
        else:
            # Fallback for SQLite (Dev environment)
            # SQLite does not support ON CONFLICT easily with multi-dialect ORM in SQLAlchemy without dialect-specific insert
            # We can check if it exists first
            stmt = select(PspWebhookLogModel).where(
                PspWebhookLogModel.psp_provider == psp_provider,
                PspWebhookLogModel.event_id == event_id
            )
            result = await session.execute(stmt)
            existing = result.scalars().first()
            if existing:
                return None
                
            db_obj = PspWebhookLogModel(
                psp_provider=psp_provider,
                event_type=payload.get("type", "unknown"),
                event_id=event_id,
                payload=payload,
                signature=signature,
                is_verified=True,
                is_processed=False,
                received_at=datetime.now(timezone.utc)
            )
            session.add(db_obj)
            await session.flush()
            return db_obj.id

    async def mark_as_processed(self, log_id: str, session: Any = None) -> None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
        db_obj = await session.get(PspWebhookLogModel, log_id)
        if db_obj:
            db_obj.is_processed = True
            db_obj.processed_at = datetime.now(timezone.utc)
            await session.flush()
