import hashlib
import hmac
import json
import time

from app.core.config import settings
from app.core.exceptions import InvalidSignatureError, ReplayAttackError


class GHNWebhookVerifier:
    def __init__(self, secret: str, tolerance_seconds: int | None = None):
        self._secret = secret.encode("utf-8")
        self._tolerance = tolerance_seconds or settings.TIMESTAMP_TOLERANCE_SECONDS

    def verify(self, payload: bytes, headers: dict[str, str]) -> dict:
        signature = headers.get("X-GHN-Signature") or headers.get("x-ghn-signature")
        timestamp = headers.get("X-GHN-Timestamp") or headers.get("x-ghn-timestamp")
        if not signature or not timestamp:
            raise InvalidSignatureError("Missing GHN webhook signature headers.")

        try:
            ts = int(timestamp)
        except ValueError as exc:
            raise InvalidSignatureError("Invalid GHN webhook timestamp.") from exc

        if abs(int(time.time()) - ts) > self._tolerance:
            raise ReplayAttackError("GHN webhook timestamp expired.")

        signed_payload = timestamp.encode("utf-8") + b"." + payload
        expected = hmac.new(self._secret, signed_payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise InvalidSignatureError("GHN webhook signature verification failed.")

        return json.loads(payload.decode("utf-8"))
