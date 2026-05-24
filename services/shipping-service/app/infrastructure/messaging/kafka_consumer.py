import asyncio
import json
import logging

from aiokafka import AIOKafkaConsumer
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.config import KafkaConfig
from app.domain.ports.event_publisher import EventPublisher
from app.infrastructure.container import AppContainer

logger = logging.getLogger(__name__)


class ShippingEventConsumer:
    def __init__(
        self,
        config: KafkaConfig,
        session_factory: async_sessionmaker,
        event_publisher: EventPublisher,
        container: AppContainer,
    ):
        self._config = config
        self._session_factory = session_factory
        self._event_publisher = event_publisher
        self._container = container
        self._consumer: AIOKafkaConsumer | None = None
        self._stopped = asyncio.Event()

    async def start(self) -> None:
        self._consumer = AIOKafkaConsumer(
            self._config.topic_order_confirmed,
            bootstrap_servers=self._config.bootstrap_servers,
            group_id=self._config.consumer_group,
            enable_auto_commit=False,
        )
        await self._consumer.start()
        try:
            async for msg in self._consumer:
                envelope = json.loads(msg.value.decode("utf-8"))
                if not await self._event_publisher.verify_inbound(envelope):
                    logger.warning("Rejected unsigned order.confirmed event")
                    await self._consumer.commit()
                    continue
                async with self._session_factory() as session:
                    usecase = self._container.create_shipment_from_order_use_case(session)
                    await usecase.execute(envelope)
                await self._consumer.commit()
                if self._stopped.is_set():
                    break
        finally:
            await self.stop()

    async def stop(self) -> None:
        self._stopped.set()
        if self._consumer is not None:
            await self._consumer.stop()
