from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from typing import Any


class SagaStatus(StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"
    COMPENSATED = "compensated"


CHECKOUT_STEPS = (
    "reserve_inventory",
    "fraud_check",
    "process_payment",
    "confirm_order",
)


@dataclass
class SagaStateEntity:
    id: str
    order_id: str
    saga_type: str = "checkout"
    current_step: str = CHECKOUT_STEPS[0]
    status: SagaStatus = SagaStatus.IN_PROGRESS
    steps_completed: list[str] = field(default_factory=list)
    steps_remaining: list[str] = field(default_factory=list)
    compensation_log: list[dict[str, Any]] = field(default_factory=list)
    error_details: dict[str, Any] | None = None
    retry_count: int = 0
    max_retries: int = 3
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None

    def mark_step_completed(self, step: str) -> None:
        if step in self.steps_remaining:
            self.steps_remaining.remove(step)
        if step not in self.steps_completed:
            self.steps_completed.append(step)
        self.current_step = self.steps_remaining[0] if self.steps_remaining else step

    def start_compensation(self) -> None:
        self.status = SagaStatus.COMPENSATING

    def complete(self) -> None:
        self.status = SagaStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        self.current_step = "completed"

    def fail(self, error: dict[str, Any]) -> None:
        self.status = SagaStatus.FAILED
        self.error_details = error

    def log_compensation(self, action: str, details: dict[str, Any]) -> None:
        self.compensation_log.append(
            {
                "action": action,
                "details": details,
                "at": datetime.now(timezone.utc).isoformat(),
            }
        )
