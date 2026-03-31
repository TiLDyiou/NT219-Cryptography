import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db
from app.core.database import AsyncSessionLocal
from app.crud.merchant import merchant as crud_merchant
from app.schemas.merchant import MerchantCreate

async def run_tests():
    print("=== CHUẨN BỊ MÔI TRƯỜNG DB ===")
    await init_db()
    
    # Tạo merchant giả để thoả mãn Foreign Key constraint
    async with AsyncSessionLocal() as db:
        existing = await crud_merchant.get(db, id="m_123")
        if not existing:
            await crud_merchant.create(db, obj_in=MerchantCreate(code="test_merch_123"), ext_data={"id": "m_123"})
        existing2 = await crud_merchant.get(db, id="m_456")
        if not existing2:
            await crud_merchant.create(db, obj_in=MerchantCreate(code="test_merch_456"), ext_data={"id": "m_456"})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("=== CHẠY CÁC BƯỚC TỰ KIỂM TRA LỖI CATALOG API ===")
        
        # 1. Validation Lỗi
        print("\n1. Test Validation Error (Price < 0):")
        res1 = await client.post("/api/v1/merchant/products", 
            headers={"Authorization": "Bearer m_123"},
            json={
                "sku": "SKU-ERR",
                "name": "Lỗi",
                "base_price": -100 # Invalid
            }
        )
        print(f"Status: {res1.status_code}")
        print(f"Response: {res1.json()}")
        assert res1.status_code == 422 # Unprocessable Entity
        
        # 2. Tạo sản phẩm thành công
        print("\n2. Tạo sản phẩm thành công:")
        res_create = await client.post("/api/v1/merchant/products", 
            headers={"Authorization": "Bearer m_123"},
            json={
                "sku": "SKU-OK",
                "name": "Sản phẩm hợp lệ",
                "base_price": 100000
            }
        )
        print(f"Status: {res_create.status_code}")
        data = res_create.json()["data"]
        product_id = data["id"]
        version = data["version"]
        print(f"Đã tạo Product ID: {product_id}, Version: {version}")

        # 3. Test Optimistic Locking (Update với version cũ)
        print("\n3. Test Optimistic Locking (Truyền sai version):")
        res_opt = await client.put(f"/api/v1/merchant/products/{product_id}", 
            headers={"Authorization": "Bearer m_123"},
            json={
                "base_price": 200000,
                "version": version - 1 # Old version
            }
        )
        print(f"Status: {res_opt.status_code}")
        print(f"Response: {res_opt.json()}")
        assert res_opt.status_code == 409

        # 4. Test RLS Violation (Sửa SP của merchant khác)
        print("\n4. Test RLS Violation (Thử sửa product của m_123 bằng acc m_456):")
        res_rls = await client.put(f"/api/v1/merchant/products/{product_id}", 
            headers={"Authorization": "Bearer m_456"}, # Fake attacker
            json={
                "base_price": 50000,
                "version": version
            }
        )
        print(f"Status: {res_rls.status_code}")
        print(f"Response: {res_rls.json()}")
        assert res_rls.status_code == 403

        # 5. Public GET (Check list)
        print("\n5. Public API (List SP Active):")
        res_pub = await client.get("/api/v1/public/products")
        print(f"Status: {res_pub.status_code}")
        print(f"Data count: {len(res_pub.json()['data'])}")
        
        # 6. Delete
        print("\n6. Xóa item thành công:")
        res_del = await client.delete(f"/api/v1/merchant/products/{product_id}", headers={"Authorization": "Bearer m_123"})
        print(f"Status: {res_del.status_code}")
        
        # 7. Lại get detail sẽ lỗi Not Found vì đã soft delete
        print("\n7. Get lại detail item đã bị xóa (Test NotFound):")
        res_notfound = await client.get(f"/api/v1/public/products/{product_id}")
        print(f"Status: {res_notfound.status_code}")
        print(f"Response: {res_notfound.json()}")
        assert res_notfound.status_code == 404
        
        print("\n=== THE END ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
