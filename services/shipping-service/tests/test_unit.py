import hashlib
import hmac
import json
import time

import pytest

from app.core.exceptions import BusinessRuleException, InvalidSignatureError, ReplayAttackError
from app.domain.value_objects.address import Address
from app.domain.value_objects.shipment_status import ShipmentStatus, can_transition
from app.infrastructure.external.ghn_webhook_verifier import GHNWebhookVerifier
from app.infrastructure.external.mock_carrier_adapter import MockCarrierAdapter


class TestShipmentStatus:
    def test_valid_transition(self):
        assert can_transition(ShipmentStatus.PENDING, ShipmentStatus.LABEL_CREATED) is True

    def test_invalid_transition(self):
        assert can_transition(ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED) is False


class TestAddress:
    def test_requires_country_code_length(self):
        with pytest.raises(BusinessRuleException):
            Address(line1="1 Nguyen Hue", city="HCM", country_code="VNM")

    def test_public_mask_excludes_line1(self):
        masked = Address(line1="1 Nguyen Hue", city="HCM", country_code="VN").public_mask()
        assert "line1" not in masked
        assert masked["city"] == "HCM"


class TestMockCarrier:
    @pytest.mark.asyncio
    async def test_create_label_returns_tracking_number(self):
        class Shipment:
            id = "ship-123"

        label = await MockCarrierAdapter().create_label(Shipment())
        assert label.tracking_number.startswith("MOCK")


class TestGHNWebhookVerifier:
    def test_valid_signature(self):
        payload = json.dumps({"tracking_number": "GHN1", "status": "in_transit"}).encode()
        timestamp = str(int(time.time()))
        signature = hmac.new(
            b"secret", timestamp.encode() + b"." + payload, hashlib.sha256
        ).hexdigest()
        data = GHNWebhookVerifier("secret").verify(
            payload,
            {"X-GHN-Timestamp": timestamp, "X-GHN-Signature": signature},
        )
        assert data["tracking_number"] == "GHN1"

    def test_invalid_signature(self):
        payload = b'{"tracking_number":"GHN1"}'
        with pytest.raises(InvalidSignatureError):
            GHNWebhookVerifier("secret").verify(
                payload,
                {"X-GHN-Timestamp": str(int(time.time())), "X-GHN-Signature": "bad"},
            )

    def test_expired_timestamp(self):
        payload = b'{"tracking_number":"GHN1"}'
        old = str(int(time.time()) - 1000)
        sig = hmac.new(b"secret", old.encode() + b"." + payload, hashlib.sha256).hexdigest()
        with pytest.raises(ReplayAttackError):
            GHNWebhookVerifier("secret", tolerance_seconds=10).verify(
                payload,
                {"X-GHN-Timestamp": old, "X-GHN-Signature": sig},
            )
