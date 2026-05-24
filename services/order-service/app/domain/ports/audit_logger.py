from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


@dataclass
class AuditEvent:
    table_name: str
    record_id: str
    action: str
    old_data: dict[str, Any] | None
    new_data: dict[str, Any] | None
    changed_fields: list[str]
    actor_id: str | None
    actor_type: str
    ip_address: str | None = None
    user_agent: str | None = None
    correlation_id: str | None = None
    event_id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "table_name": self.table_name,
            "record_id": self.record_id,
            "action": self.action,
            "old_data": self.old_data,
            "new_data": self.new_data,
            "changed_fields": self.changed_fields,
            "actor_id": self.actor_id,
            "actor_type": self.actor_type,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "correlation_id": self.correlation_id,
            "created_at": self.created_at.isoformat(),
            "source": "order-service",
        }


class AuditLogger(ABC):
    @abstractmethod
    async def log(self, event: AuditEvent) -> None:
        raise NotImplementedError
