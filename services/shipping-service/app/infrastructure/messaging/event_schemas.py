import time
from typing import Any
from uuid import uuid4


def build_envelope(
    event_type: str,
    aggregate_id: str,
    payload: dict[str, Any],
    signature: dict[str, Any],
    aggregate_type: str = "shipping",
) -> dict[str, Any]:
    return {
        "event_id": str(uuid4()),
        "event_type": event_type,
        "aggregate_type": aggregate_type,
        "aggregate_id": aggregate_id,
        "timestamp": int(time.time()),
        "payload": payload,
        "signature": signature,
    }
