import os
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.infrastructure.container import init_container, shutdown_container
from app.infrastructure.persistence.database import init_db
from app.infrastructure.persistence.models import Base, InventoryItemModel, WarehouseModel
from tests.factories import (
    get_mock_inventory_create,
    get_mock_inventory_item_model,
    get_mock_reserve_payload,
    get_mock_warehouse_create,
    get_mock_warehouse_model,
)


TEST_DB = Path(__file__).resolve().parent.parent / "test_inventory_api.db"


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
        session.add_all(
            [
                get_mock_warehouse_model(),
                get_mock_inventory_item_model(),
            ]
        )
        await session.commit()

    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    await shutdown_container()
    if TEST_DB.exists():
        TEST_DB.unlink()


def _reserve_body(overrides: dict | None = None) -> dict:
    payload = get_mock_reserve_payload(overrides)
    return {
        "order_id": payload["order_id"],
        "saga_id": payload.get("saga_id"),
        "idempotency_key": payload["idempotency_key"],
        "items": payload["items"],
    }


class TestSystemEndpoints:
    @pytest.mark.asyncio
    async def test_health_returns_ok(self, api_client):
        response = await api_client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_ready_returns_database_status(self, api_client):
        response = await api_client.get("/ready")
        assert response.status_code == 200
        body = response.json()
        assert body["ready"] is True
        assert body["checks"]["database"] is True

    @pytest.mark.asyncio
    async def test_metrics_returns_prometheus_format(self, api_client):
        response = await api_client.get("/metrics")
        assert response.status_code == 200
        assert "inventory_" in response.text or response.text != ""


class TestInternalReservationEndpoints:
    @pytest.mark.asyncio
    async def test_reserve_stock_via_api(self, api_client):
        body = _reserve_body(
            {"order_id": "api-order-1", "idempotency_key": "api-idem-1"}
        )
        response = await api_client.post(
            "/api/v1/internal/reservations/reserve",
            json=body,
            headers={"Idempotency-Key": "api-idem-1"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["reserved"] is True
        assert len(data["data"]["reservations"]) == 1

    @pytest.mark.asyncio
    async def test_reserve_requires_idempotency_header(self, api_client):
        body = _reserve_body({"order_id": "api-order-missing-idem"})
        response = await api_client.post(
            "/api/v1/internal/reservations/reserve",
            json=body,
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNAUTHORIZED"

    @pytest.mark.asyncio
    async def test_reserve_out_of_stock_returns_409(self, api_client):
        body = _reserve_body(
            {
                "order_id": "api-order-oos",
                "idempotency_key": "api-idem-oos",
                "items": [
                    {
                        "product_id": "prod-1",
                        "variant_id": None,
                        "merchant_id": "m-1",
                        "sku": "SKU-1",
                        "quantity": 999,
                    }
                ],
            }
        )
        response = await api_client.post(
            "/api/v1/internal/reservations/reserve",
            json=body,
            headers={"Idempotency-Key": "api-idem-oos"},
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "OUT_OF_STOCK"

    @pytest.mark.asyncio
    async def test_confirm_and_release_via_api(self, api_client):
        body = _reserve_body(
            {
                "order_id": "api-order-flow",
                "idempotency_key": "api-idem-flow",
                "items": [
                    {
                        "product_id": "prod-1",
                        "variant_id": None,
                        "merchant_id": "m-1",
                        "sku": "SKU-1",
                        "quantity": 1,
                    }
                ],
            }
        )
        await api_client.post(
            "/api/v1/internal/reservations/reserve",
            json=body,
            headers={"Idempotency-Key": "api-idem-flow"},
        )

        confirm = await api_client.post(
            "/api/v1/internal/reservations/confirm",
            json={"order_id": "api-order-flow"},
        )
        assert confirm.status_code == 200
        assert confirm.json()["data"]["confirmed_count"] == 1

        body2 = _reserve_body(
            {
                "order_id": "api-order-release",
                "idempotency_key": "api-idem-release",
                "items": [
                    {
                        "product_id": "prod-1",
                        "variant_id": None,
                        "merchant_id": "m-1",
                        "sku": "SKU-1",
                        "quantity": 1,
                    }
                ],
            }
        )
        await api_client.post(
            "/api/v1/internal/reservations/reserve",
            json=body2,
            headers={"Idempotency-Key": "api-idem-release"},
        )

        release = await api_client.post(
            "/api/v1/internal/reservations/release",
            json={"order_id": "api-order-release"},
        )
        assert release.status_code == 200
        assert release.json()["data"]["released_count"] == 1


class TestMerchantEndpoints:
    @pytest.mark.asyncio
    async def test_list_and_create_warehouse(self, api_client):
        list_resp = await api_client.get(
            "/api/v1/merchant/warehouses",
            headers={"X-Merchant-Id": "m-1"},
        )
        assert list_resp.status_code == 200
        assert len(list_resp.json()["data"]) >= 1

        create_resp = await api_client.post(
            "/api/v1/merchant/warehouses",
            json=get_mock_warehouse_create({"code": "API-WH"}),
            headers={"X-Merchant-Id": "m-1"},
        )
        assert create_resp.status_code == 201
        assert create_resp.json()["data"]["code"] == "API-WH"

    @pytest.mark.asyncio
    async def test_merchant_requires_identity(self, api_client):
        response = await api_client.get("/api/v1/merchant/warehouses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_inventory_upsert_and_list(self, api_client):
        create_resp = await api_client.post(
            "/api/v1/merchant/inventory",
            json=get_mock_inventory_create({"sku": "API-SKU"}),
            headers={"X-Merchant-Id": "m-1"},
        )
        assert create_resp.status_code == 201
        assert create_resp.json()["data"]["sku"] == "API-SKU"

        list_resp = await api_client.get(
            "/api/v1/merchant/inventory",
            headers={"X-Merchant-Id": "m-1"},
        )
        assert list_resp.status_code == 200
        skus = [row["sku"] for row in list_resp.json()["data"]]
        assert "API-SKU" in skus


class TestSystemInventoryEndpoints:
    @pytest.mark.asyncio
    async def test_bulk_availability(self, api_client):
        response = await api_client.post(
            "/api/v1/system/availability",
            json=[{"product_id": "prod-1", "variant_id": None}],
        )
        assert response.status_code == 200
        data = response.json()["data"][0]
        assert data["in_stock"] is True
        assert data["total_available"] >= 0

    @pytest.mark.asyncio
    async def test_expire_reservations_requires_internal_token(self, api_client):
        response = await api_client.post("/api/v1/system/reservations/expire")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_expire_reservations_with_valid_token(self, api_client):
        response = await api_client.post(
            "/api/v1/system/reservations/expire",
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert response.status_code == 200
        assert "expired_count" in response.json()["data"]
