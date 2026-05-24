from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def build_envelope(
    event_type: str,
    aggregate_id: str,
    payload: dict[str, Any],
    signature: dict[str, Any],
    event_id: str | None = None,
) -> dict[str, Any]:
    return {
        "event_id": event_id or str(uuid4()),
        "event_type": event_type,
        "aggregate_id": aggregate_id,
        "payload": payload,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "signature": signature,
    }
