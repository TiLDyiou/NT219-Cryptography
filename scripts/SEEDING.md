# Hướng dẫn Seed Sản phẩm vào Catalog Service

## Dataset có sẵn

| File                        | Nguồn           | Số sản phẩm | Ngôn ngữ   |
| --------------------------- | --------------- | ----------- | ---------- |
| `data/tiki_electronics.csv` | Tiki.vn (crawl) | 1.440       | Tiếng Việt |

File CSV hiện đã được chuẩn hóa theo model `Product` của `catalog-service`:

```csv
id,merchant_id,sku,name,status,product_type,base_price,currency_code,weight_grams,is_taxable,brand,metadata_json,images,created_at,updated_at,deleted_at,is_active,version
```

Các cột `id`, `merchant_id`, `created_at`, `updated_at`, `deleted_at`, `version` đã có sẵn để hỗ trợ import/đối chiếu theo table. Khi seed qua API, script vẫn chỉ gửi các field thuộc `ProductCreate`; `merchant_id` lấy từ Bearer token và các field DB-only được service tự xử lý. Trong thiết kế DB, trường metadata sản phẩm tương ứng với `metadata_json` ở code/API.

Mẫu dữ liệu:

```
Điện Thoại Samsung Galaxy M12 (4GB/64GB) - Hàng Chính Hãng  →  3.490.000 VND
Điện thoại Realme Narzo 50i (4GB/64GB) - Hàng chính hãng    →  3.199.000 VND
...
```

---

## Yêu cầu

- **Catalog service đang chạy** (bước này làm SAU khi đã chạy infra scripts)
- Python 3.9+ với pip

---

## Cài đặt trên VM (NODE-2)

### Bước 1 — Cài dependencies

```bash
ssh user@<NODE2_IP>
cd /opt/uitstore

pip3 install requests pandas
```

### Bước 2 — Kiểm tra catalog-service đang chạy

```bash
systemctl status catalog-service

# Test API
curl http://localhost:8001/api/v1/public/products?page=1&size=1
# Phải trả về JSON, không lỗi connection
```

### Bước 3 — Chạy seed script

```bash
cd /opt/uitstore

# Import toàn bộ 1.440 sản phẩm điện tử
python3 scripts/seed_products.py \
  --file scripts/data/tiki_electronics.csv

# Script tự động:
#   1. Tạo merchant "tiki-electronics" qua Admin API
#   2. Upload 1.440 sản phẩm với Bearer token của merchant đó
```

Kết quả kỳ vọng:

```
=======================================================
  UIT Store — Product Seeder
=======================================================
  File   : scripts/data/tiki_electronics.csv
  Service: http://localhost:8001
  Dataset: electronics
=======================================================
Kết nối catalog-service: OK (http://localhost:8001)

[1/2] Tạo merchant 'tiki-electronics'...
      OK — merchant_id: a1b2c3d4-...

[2/2] Import 1.440 sản phẩm (dataset: electronics)...

  [   1] OK   ELEC-0000-dien-thoai-samsung-galaxy-m12
  [   2] OK   ELEC-0001-dien-thoai-realme-narzo-50i
  ...
  [1440] OK   ELEC-1439-...

=======================================================
  Kết quả : 1440 thành công / 0 lỗi
=======================================================
```

---

## Các tùy chọn nâng cao

### Chỉ import một phần (để test nhanh)

```bash
python3 scripts/seed_products.py \
  --file scripts/data/tiki_electronics.csv \
  --limit 50 --skip-errors
```

### Dùng qua Envoy (NODE-1) thay vì gọi thẳng service

```bash
python3 scripts/seed_products.py \
  --file scripts/data/tiki_electronics.csv \
  --url http://localhost:10000
```

### Dùng merchant ID đã có (chạy lại mà không tạo merchant mới)

```bash
# Lấy merchant_id từ lần chạy trước trong output
python3 scripts/seed_products.py \
  --file scripts/data/tiki_electronics.csv \
  --merchant-id a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Đổi admin token (nếu .env đã set ADMIN_TOKEN khác)

```bash
python3 scripts/seed_products.py \
  --file scripts/data/tiki_electronics.csv \
  --admin-token my_custom_admin_token
```

---

## Xác nhận sản phẩm đã vào DB

```bash
# Gọi public API — trả về danh sách sản phẩm active
curl "http://localhost:8001/api/v1/public/products?page=1&size=10&status=active" | python3 -m json.tool
```

---

## Troubleshooting

| Lỗi                        | Nguyên nhân                             | Cách xử lý                                 |
| -------------------------- | --------------------------------------- | ------------------------------------------ |
| `Connection refused`       | Catalog service chưa chạy               | `systemctl start catalog-service`          |
| `401 Invalid admin token`  | `ADMIN_TOKEN` trong `.env` khác default | Thêm `--admin-token <token>`               |
| `409 Merchant đã tồn tại`  | Đã seed trước đó                        | Thêm `--merchant-id <UUID>`                |
| `422 Unprocessable Entity` | Dữ liệu CSV không đúng format           | Kiểm tra file CSV có bị lỗi encoding không |
| Import chậm hoặc timeout   | Service quá tải                         | Thêm `--limit 200` và chạy nhiều lần       |
