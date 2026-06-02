import asyncio
import json
import logging

from app.core.config import KafkaConfig

logger = logging.getLogger(__name__)


class NotificationEventConsumer:
    def __init__(self, config: KafkaConfig, session_factory, event_publisher, container):
        self._config = config
        self._session_factory = session_factory
        self._event_publisher = event_publisher
        self._container = container
        self._consumer = None
        self._stopped = asyncio.Event()

    async def start(self) -> None:
        from aiokafka import AIOKafkaConsumer

        self._consumer = AIOKafkaConsumer(
            self._config.topic_order_checkout,
            self._config.topic_payment_events,
            self._config.topic_shipping_events,
            bootstrap_servers=self._config.bootstrap_servers,
            group_id=self._config.consumer_group,
            enable_auto_commit=False,
        )
        await self._consumer.start()
        try:
            async for msg in self._consumer:
                envelope = json.loads(msg.value.decode("utf-8"))
                valid = await self._event_publisher.verify_inbound(envelope)
                if not valid:
                    logger.warning("Rejected event with invalid signature: topic=%s", msg.topic)
                    continue
                event_id = envelope["event_id"]
                claimed = await self._container.idempotency_store.mark_processed(
                    event_id,
                    self._container.settings.redis.idempotency_ttl_seconds,
                )
                if not claimed:
                    await self._consumer.commit()
                    continue
                # H-14: chỉ GIỮ claim khi gửi thành công. Nếu dispatch lỗi → nhả claim
                # và KHÔNG commit offset để Kafka redeliver xử lý lại (không mất thông báo).
                try:
                    async with self._session_factory() as session:
                        await self.dispatch(msg.topic, envelope, session)
                except Exception:
                    await self._container.idempotency_store.remove(event_id)
                    raise
                await self._consumer.commit()
                if self._stopped.is_set():
                    break
        finally:
            await self.stop()

    async def dispatch(self, topic: str, envelope: dict, session) -> None:
        if topic == self._config.topic_order_checkout:
            use_case = self._container.handle_order_event_use_case(session)
        elif topic == self._config.topic_payment_events:
            use_case = self._container.handle_payment_event_use_case(session)
        else:
            use_case = self._container.handle_shipping_event_use_case(session)
        await use_case.execute(envelope)

    async def stop(self) -> None:
        self._stopped.set()
        if self._consumer is not None:
            await self._consumer.stop()
