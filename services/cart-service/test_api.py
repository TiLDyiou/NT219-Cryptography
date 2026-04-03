import asyncio
import uuid

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.core.database import init_db


async def run_tests():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": "Bearer user_1"}
        merchant_id = str(uuid.uuid4())

        get_cart = await client.get(f"/api/v1/user/carts/{merchant_id}", headers=headers)
        assert get_cart.status_code == 200
        cart = get_cart.json()["data"]
        assert cart["status"] == "active"
        version = cart["version"]

        add_item = await client.post(
            f"/api/v1/user/carts/{merchant_id}/items",
            headers=headers,
            json={
                "cart_version": version,
                "product_id": "product_1",
                "variant_id": None,
                "quantity": 2,
                "unit_price_snapshot": "100000",
                "product_name_snapshot": "Ao thun",
                "variant_label_snapshot": "Size M",
                "image_url_snapshot": "https://cdn.example.com/ao-thun.jpg",
                "metadata_json": {},
            },
        )
        assert add_item.status_code == 200
        cart = add_item.json()["data"]
        assert cart["item_count"] == 2
        assert str(cart["subtotal"]) == "200000.00"
        item_id = cart["items"][0]["id"]
        version = cart["version"]

        update_item = await client.put(
            f"/api/v1/user/carts/{merchant_id}/items/{item_id}",
            headers=headers,
            json={"cart_version": version, "quantity": 5},
        )
        assert update_item.status_code == 200
        cart = update_item.json()["data"]
        assert cart["item_count"] == 5
        assert str(cart["subtotal"]) == "500000.00"
        version = cart["version"]

        remove_item = await client.delete(
            f"/api/v1/user/carts/{merchant_id}/items/{item_id}",
            headers=headers,
            params={"cart_version": version},
        )
        assert remove_item.status_code == 200
        cart = remove_item.json()["data"]
        assert cart["item_count"] == 0
        version = cart["version"]

        convert_empty = await client.post(
            f"/api/v1/user/carts/{merchant_id}/convert",
            headers=headers,
            json={"cart_version": version},
        )
        assert convert_empty.status_code == 422

        system_expire = await client.post(
            "/api/v1/system/carts/expire",
            headers={"X-Internal-Token": "cart_internal_dev_token"},
        )
        assert system_expire.status_code == 200

        print("Cart service smoke tests passed.")


if __name__ == "__main__":
    asyncio.run(run_tests())
