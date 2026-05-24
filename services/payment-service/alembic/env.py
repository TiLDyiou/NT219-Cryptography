import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Import settings and metadata
from app.core.config import settings
from app.infrastructure.persistence.models.base import Base

# Import all models to ensure they are registered on Base.metadata before autogenerating migrations
# (We will create these model files in the next phases)
try:
    from app.infrastructure.persistence.models.payment_method import PaymentMethodModel
    from app.infrastructure.persistence.models.payment_transaction import PaymentTransactionModel
    from app.infrastructure.persistence.models.idempotency_key import IdempotencyKeyModel
    from app.infrastructure.persistence.models.psp_webhook_log import PspWebhookLogModel
    from app.infrastructure.persistence.models.settlement import MerchantSettlementModel, SettlementItemModel
    from app.infrastructure.persistence.models.outbox import OutboxEventModel
    from app.infrastructure.persistence.models.audit import AuditLogModel
except ImportError:
    pass

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
        render_as_batch=True if settings.DATABASE_URL.startswith("sqlite") else False,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    raise RuntimeError("Offline mode not supported")
else:
    run_migrations_online()
