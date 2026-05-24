from typing import Any, TypedDict


class EventSignatureBlock(TypedDict):
    algorithm: str
    key_version: int
    value: str
    signed_hash: str


class EventEnvelope(TypedDict, total=False):
    event_id: str
    event_type: str
    aggregate_id: str
    timestamp: str
    version: int
    source: str
    payload: dict[str, Any]
    signature: EventSignatureBlock


def build_envelope(event_data: dict[str, Any], signature: dict[str, Any]) -> EventEnvelope:
    return {
        **event_data,
        "signature": {
            "algorithm": signature["algorithm"],
            "key_version": signature["key_version"],
            "value": signature["value"],
            "signed_hash": signature["signed_hash"],
        },
    }
