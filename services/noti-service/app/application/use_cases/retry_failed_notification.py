import json

from app.application.use_cases.send_notification import SendNotificationCommand, SendNotificationUseCase
from app.domain.ports.crypto_service import CryptoService
from app.infrastructure.persistence.models import NotificationLogModel
from app.infrastructure.persistence.repositories.template_repository import TemplateRepository


class RetryFailedNotificationUseCase:
    def __init__(
        self,
        session,
        send_notification_use_case: SendNotificationUseCase,
        template_repository: TemplateRepository,
        crypto_service: CryptoService,
    ):
        self._session = session
        self._send = send_notification_use_case
        self._templates = template_repository
        self._crypto = crypto_service

    async def execute(self, row: NotificationLogModel):
        template = None
        if row.template_id:
            templates = await self._templates.list_all(self._session)
            template = next((item for item in templates if item.id == row.template_id), None)
        if template is None:
            return None
        if not row.recipient_email_encrypted or not row.render_variables_encrypted:
            return None
        recipient_email = await self._crypto.decrypt_field(row.recipient_email_encrypted)
        variables_raw = await self._crypto.decrypt_field(row.render_variables_encrypted)
        variables = json.loads(variables_raw or "{}")
        return await self._send.execute(
            SendNotificationCommand(
                user_id=row.user_id,
                recipient_email=recipient_email,
                template_code=template.code,
                category=row.category,
                variables=variables,
                reference_type=row.reference_type,
                reference_id=row.reference_id,
                priority=row.priority,
                metadata=row.metadata_json or {},
            )
        )
