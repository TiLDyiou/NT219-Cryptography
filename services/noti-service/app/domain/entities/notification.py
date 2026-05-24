from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.core.exceptions import BusinessRuleException
from app.domain.value_objects.notification_status import NotificationStatus, can_transition


@dataclass
class NotificationEntity:
    user_id: str
    channel_id: str
    category: str
    subject: str
    content_hash: str
    recipient_masked: str
    recipient_email_encrypted: bytes | None = None
    render_variables_encrypted: bytes | None = None
    reference_type: str | None = None
    reference_id: str | None = None
    template_id: str | None = None
    priority: str = "normal"
    metadata: dict[str, Any] = field(default_factory=dict)
    id: str | None = None
    status: NotificationStatus = NotificationStatus.QUEUED
    attempt_count: int = 0
    max_attempts: int = 3

    def transition_to(self, target: NotificationStatus) -> None:
        if not can_transition(self.status, target):
            raise BusinessRuleException(f"Cannot transition notification from {self.status} to {target}.")
        self.status = target

    def mark_sent(self) -> None:
        if self.status == NotificationStatus.QUEUED:
            self.transition_to(NotificationStatus.SENDING)
        self.transition_to(NotificationStatus.SENT)

    def mark_failed(self, error_code: str | None = None) -> None:
        if self.status == NotificationStatus.QUEUED:
            self.transition_to(NotificationStatus.SENDING)
        self.transition_to(NotificationStatus.FAILED)
        if error_code:
            self.metadata["error_code"] = error_code

    @property
    def created_at(self) -> datetime:
        return datetime.now(timezone.utc)
