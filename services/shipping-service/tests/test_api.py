import os
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.infrastructure.container import init_container, shutdown_container
from app.infrastructure.persistence.database import init_db
from app.infrastructure.persistence.models import Base, ShipmentModel
from tests.factories import get_mock_provider_model, get_mock_rate_model

TEST_DB = Path(__file__).resolve().parent.parent / "test_shipping_api.db"


@pytest_asyncio.fixture
async def api_client():
    if TEST_DB.exists():
        TEST_DB.unlink()
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB}"

    from app.infrastructure.persistence import database as db_module

    db_module.ACTIVE_DATABASE_URL = os.environ["DATABASE_URL"]
    db_module.engine = db_module._build_engine(db_module.ACTIVE_DATABASE_URL)
    db_module.AsyncSessionLocal = db_module._build_sessionmaker()

    await init_db()
    await init_container()

    async with db_module.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with db_module.AsyncSessionLocal() as session:
        session.add_all([get_mock_provider_model(), get_mock_rate_model()])
        session.add(
            ShipmentModel(
                id="ship-api-1",
                order_id="order-api-1",
                merchant_id="m-1",
                provider_id="provider-mock",
                status="label_created",
                tracking_number="MOCKAPI1",
                country_code="VN",
                city="HCM",
                state="HCM",
                dimensions_cm={"weight_grams": 500},
                provider_response={},
                metadata_json={},
            )
        )
        await session.commit()

    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    await shutdown_container()
    if TEST_DB.exists():
        TEST_DB.unlink()


class TestSystemEndpoints:
    @pytest.mark.asyncio
    async def test_health_returns_ok(self, api_client):
        response = await api_client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestPublicEndpoints:
    @pytest.mark.asyncio
    async def test_quote_rate(self, api_client):
        response = await api_client.post(
            "/api/v1/public/rates/quote",
            json={"weight_grams": 500},
        )
        assert response.status_code == 200
        assert response.json()["data"]["provider_code"] == "mock"

    @pytest.mark.asyncio
    async def test_public_tracking_masks_address(self, api_client):
        response = await api_client.get("/api/v1/public/track/MOCKAPI1")
        assert response.status_code == 200
        address = response.json()["data"]["address"]
        assert address["city"] == "HCM"
        assert "line1" not in address


class TestMerchantEndpoints:
    @pytest.mark.asyncio
    async def test_merchant_requires_identity(self, api_client):
        response = await api_client.get("/api/v1/merchant/shipments")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_shipments(self, api_client):
        response = await api_client.get(
            "/api/v1/merchant/shipments",
            headers={"X-Merchant-Id": "m-1"},
        )
        assert response.status_code == 200
        assert response.json()["data"][0]["order_id"] == "order-api-1"

    @pytest.mark.asyncio
    async def test_idor_rejected(self, api_client):
        response = await api_client.get(
            "/api/v1/merchant/shipments/ship-api-1",
            headers={"X-Merchant-Id": "m-2"},
        )
        assert response.status_code == 403
