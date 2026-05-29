#!/usr/bin/env python3
"""
Seed merchant + sản phẩm vào catalog-service qua API đúng flow:
  1. Admin tạo merchant  →  POST /api/v1/admin/merchants  (X-Admin-Token)
  2. Merchant upload sản phẩm  →  POST /api/v1/merchant/products  (Bearer {merchant_id})

Hỗ trợ 2 dataset:
  - Tiki Electronics: https://github.com/nhdquyen/Tiki-Web-Scraping
  - Tiki Books:       https://www.kaggle.com/datasets/biminhc/tiki-books-dataset

Cách dùng:
  pip install requests pandas
  python seed_products.py --file tiki_products.csv
  python seed_products.py --file tiki_books.csv --type books
  python seed_products.py --file tiki_products.csv --url https://abc123.ngrok-free.app
  python seed_products.py --file tiki_products.csv --limit 50 --skip-errors
"""

import argparse
import json
import re
import sys
import time
import unicodedata

import pandas as pd
import requests

# ── Config mặc định ─────────────────────────────────────────────────────────────
DEFAULT_CATALOG_URL = "http://localhost:8001"   # gọi thẳng service khi chạy local
ADMIN_TOKEN         = "admin_secret_dev"        # khớp với ADMIN_TOKEN trong .env

DELAY_BETWEEN_REQUESTS = 0.1   # giây
MAX_NAME_LENGTH = 250


# ── Helpers ──────────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", str(text))
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[\s_-]+", "-", text)


def parse_price(raw) -> float:
    if pd.isna(raw):
        return 0.0
    cleaned = re.sub(r"[^\d]", "", str(raw))
    return float(cleaned) if cleaned else 0.0


def parse_image(raw) -> list:
    if pd.isna(raw) or not str(raw).strip():
        return []
    url = str(raw).strip()
    if not url.startswith("http"):
        return []
    return [{"url": url, "position": 0, "alt": "product image"}]


def parse_bool(raw, default: bool = False) -> bool:
    if pd.isna(raw):
        return default
    if isinstance(raw, bool):
        return raw
    return str(raw).strip().lower() in {"1", "true", "yes", "y"}


def parse_optional_int(raw):
    if pd.isna(raw) or str(raw).strip() == "":
        return None
    return int(raw)


def parse_optional_str(raw):
    if pd.isna(raw):
        return None
    value = str(raw).strip()
    return value or None


def parse_json_cell(raw, default, column: str):
    if isinstance(raw, (dict, list)):
        return raw
    if pd.isna(raw) or str(raw).strip() == "":
        return default
    try:
        return json.loads(str(raw))
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON không hợp lệ ở cột {column}: {exc}") from exc


def truncate(text, max_len=MAX_NAME_LENGTH) -> str:
    s = str(text).strip() if not pd.isna(text) else ""
    return s[:max_len]


# ── Dataset mappers ───────────────────────────────────────────────────────────────

def is_catalog_product_row(row: pd.Series) -> bool:
    return {"sku", "name", "base_price"}.issubset(set(row.index))


def map_catalog_product_row(row: pd.Series, idx: int) -> dict:
    """CSV đã chuẩn hóa theo ProductCreate/catalog table columns."""
    name = truncate(row.get("name", f"Product {idx}"))
    sku = parse_optional_str(row.get("sku")) or f"ELEC-{idx:04d}-{slugify(name)[:30]}"

    return {
        "sku": sku,
        "name": name,
        "status": parse_optional_str(row.get("status")) or "active",
        "product_type": parse_optional_str(row.get("product_type")) or "physical",
        "base_price": parse_price(row.get("base_price", 0)),
        "currency_code": parse_optional_str(row.get("currency_code")) or "VND",
        "weight_grams": parse_optional_int(row.get("weight_grams")),
        "is_taxable": parse_bool(row.get("is_taxable"), True),
        "brand": parse_optional_str(row.get("brand")),
        "is_active": parse_bool(row.get("is_active"), True),
        "images": parse_json_cell(row.get("images"), [], "images"),
        "metadata_json": parse_json_cell(row.get("metadata_json"), {}, "metadata_json"),
    }


def map_electronics_row(row: pd.Series, idx: int) -> dict:
    """Tiki Electronics CSV — hỗ trợ cả raw dataset và CSV đã chuẩn hóa."""
    if is_catalog_product_row(row):
        return map_catalog_product_row(row, idx)

    name  = truncate(row.get("name", f"Product {idx}"))
    price = parse_price(row.get("price", 0))
    rating = float(row.get("rating", 0)) if not pd.isna(row.get("rating", None)) else 0.0
    sku   = f"ELEC-{idx:04d}-{slugify(name)[:30]}"

    return {
        "sku": sku,
        "name": name,
        "status": "active",
        "product_type": "physical",
        "base_price": price if price > 0 else 100_000.0,
        "currency_code": "VND",
        "weight_grams": 500,
        "is_taxable": True,
        "brand": None,
        "is_active": True,
        "images": parse_image(row.get("image")),
        "metadata_json": {
            "category": "electronics",
            "rating": rating,
            "source_url": str(row.get("product_url", "")),
            "tiki_now": bool(row.get("tiki_now", False)),
            "freeship": bool(row.get("freeship", False)),
        },
    }


def map_books_row(row: pd.Series, idx: int) -> dict:
    """Tiki Books CSV — columns: title/name, price, image_url/image, category, description, author/publisher"""
    name  = truncate(row.get("title") or row.get("name") or f"Sách {idx}")
    brand = str(row.get("author") or row.get("publisher") or "").strip() or None
    price = parse_price(row.get("price", 0))
    sku   = f"BOOK-{idx:04d}-{slugify(name)[:30]}"

    return {
        "sku": sku,
        "name": name,
        "status": "active",
        "product_type": "physical",
        "base_price": price if price > 0 else 50_000.0,
        "currency_code": "VND",
        "weight_grams": 300,
        "is_taxable": True,
        "brand": brand,
        "is_active": True,
        "images": parse_image(row.get("image_url") or row.get("image")),
        "metadata_json": {
            "category": str(row.get("category", "Sách")).strip(),
            "description": str(row.get("description", ""))[:500],
            "rating": float(row.get("rating", 0)) if not pd.isna(row.get("rating", None)) else 0.0,
        },
    }


MAPPERS = {
    "electronics": map_electronics_row,
    "books":       map_books_row,
}


def detect_dataset_type(df: pd.DataFrame) -> str:
    cols = set(df.columns.str.lower())
    if "title" in cols or "author" in cols or "publisher" in cols:
        return "books"
    return "electronics"


# ── Step 1: Tạo merchant ─────────────────────────────────────────────────────────

MERCHANT_PRESETS = {
    "electronics": {
        "code":            "tiki-electronics",
        "status":          "active",
        "is_verified":     True,
        "commission_rate": 0.05,
        "metadata_json":   {"display_name": "Tiki Electronics", "description": "Thiết bị điện tử từ Tiki"},
    },
    "books": {
        "code":            "tiki-books",
        "status":          "active",
        "is_verified":     True,
        "commission_rate": 0.03,
        "metadata_json":   {"display_name": "Tiki Books", "description": "Sách tiếng Việt từ Tiki"},
    },
}


def create_or_get_merchant(catalog_url: str, dtype: str, admin_token: str) -> str:
    """
    Tạo merchant qua Admin API. Nếu đã tồn tại (409) thì fetch lại ID.
    Trả về merchant_id (UUID) để dùng làm Bearer token.
    """
    preset = MERCHANT_PRESETS[dtype]
    endpoint = f"{catalog_url.rstrip('/')}/api/v1/admin/merchants"
    headers  = {"X-Admin-Token": admin_token, "Content-Type": "application/json"}

    print(f"\n[1/2] Tạo merchant '{preset['code']}'...")
    resp = requests.post(endpoint, json=preset, headers=headers, timeout=10)

    if resp.status_code == 201:
        merchant_id = resp.json()["data"]["id"]
        print(f"      OK — merchant_id: {merchant_id}")
        return merchant_id

    if resp.status_code == 409:
        # Đã tồn tại — lấy ID qua GET (tìm theo code không có endpoint, dùng products list thay thế)
        # Fallback: lấy từ response body nếu có
        body = resp.json()
        print(f"      Merchant đã tồn tại. Đang lấy lại ID...")
        # Thử GET /admin/merchants/{code} — không có, nên cần tạo lại với code khác
        # hoặc lấy từ lỗi message nếu service trả về
        detail = body.get("detail", "")
        print(f"      {detail}")
        print(f"      Dùng --merchant-id <UUID> để bỏ qua bước tạo merchant.")
        sys.exit(1)

    print(f"      [LỖI] {resp.status_code} — {resp.text[:200]}")
    sys.exit(1)


# ── Step 2: Import sản phẩm ──────────────────────────────────────────────────────

def import_products(
    csv_path: str,
    catalog_url: str,
    merchant_id: str,
    dataset_type: str | None,
    limit: int | None,
    skip_errors: bool,
):
    # Đọc CSV
    try:
        df = pd.read_csv(csv_path, encoding="utf-8")
    except UnicodeDecodeError:
        df = pd.read_csv(csv_path, encoding="utf-8-sig")
    except Exception as e:
        print(f"\n[LỖI] Không đọc được file: {e}")
        sys.exit(1)

    dtype  = dataset_type or detect_dataset_type(df)
    mapper = MAPPERS.get(dtype)
    if not mapper:
        print(f"[LỖI] Không hỗ trợ dataset type: {dtype}")
        sys.exit(1)

    if limit:
        df = df.head(limit)

    endpoint = f"{catalog_url.rstrip('/')}/api/v1/merchant/products"
    headers  = {"Authorization": f"Bearer {merchant_id}", "Content-Type": "application/json"}

    print(f"\n[2/2] Import {len(df):,} sản phẩm (dataset: {dtype})...")
    print(f"      Endpoint: {endpoint}\n")

    ok_count   = 0
    fail_count = 0
    fail_skus  = []

    for idx, row in df.iterrows():
        product_data = mapper(row, idx)
        sku = product_data["sku"]

        try:
            resp = requests.post(endpoint, json=product_data, headers=headers, timeout=10)
            if resp.status_code == 201:
                ok_count += 1
                print(f"  [{ok_count:4d}] OK   {sku[:55]}")
            else:
                fail_count += 1
                body    = resp.json() if resp.content else {}
                err_msg = body.get("detail") or resp.status_code
                print(f"  [FAIL] {sku[:45]} — {err_msg}")
                fail_skus.append(sku)
                if not skip_errors:
                    print("\nDừng lại do lỗi. Dùng --skip-errors để tiếp tục.")
                    break
        except requests.exceptions.Timeout:
            fail_count += 1
            print(f"  [TIMEOUT] {sku}")
            fail_skus.append(sku)
        except Exception as e:
            fail_count += 1
            print(f"  [EXCEPTION] {sku} — {e}")
            fail_skus.append(sku)
            if not skip_errors:
                break

        time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\n{'='*55}")
    print(f"  Kết quả : {ok_count} thành công / {fail_count} lỗi")
    print(f"  Merchant: {merchant_id}")
    if fail_skus:
        print(f"  SKU lỗi : {', '.join(fail_skus[:5])}{'...' if len(fail_skus) > 5 else ''}")
    print(f"{'='*55}\n")


# ── Main ─────────────────────────────────────────────────────────────────────────

def check_connection(catalog_url: str):
    try:
        resp = requests.get(f"{catalog_url}/api/v1/public/products?page=1&size=1", timeout=5)
        resp.raise_for_status()
        print(f"Kết nối catalog-service: OK ({catalog_url})")
    except Exception as e:
        print(f"[LỖI] Không kết nối được catalog-service tại {catalog_url}")
        print(f"      {e}")
        print(f"\nKiểm tra service đang chạy chưa, hoặc đổi --url cho đúng.\n")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Seed merchant + sản phẩm vào UIT Store catalog-service",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ví dụ:
  # Tạo merchant + import toàn bộ (auto detect dataset)
  python seed_products.py --file tiki_products.csv

  # Bỏ qua tạo merchant, dùng ID đã có
  python seed_products.py --file tiki_products.csv --merchant-id <UUID>

  # Import giới hạn 100 sản phẩm, bỏ qua lỗi
  python seed_products.py --file tiki_products.csv --limit 100 --skip-errors

  # Dùng qua Envoy/Tunnel
  python seed_products.py --file tiki_products.csv --url https://abc123.ngrok-free.app
        """
    )
    parser.add_argument("--file",        required=True,  help="Đường dẫn file CSV dataset")
    parser.add_argument("--url",         default=DEFAULT_CATALOG_URL, help=f"Base URL catalog-service (mặc định: {DEFAULT_CATALOG_URL})")
    parser.add_argument("--type",        choices=["electronics", "books"], default=None, help="Loại dataset (tự detect nếu bỏ trống)")
    parser.add_argument("--merchant-id", default=None,   help="Dùng merchant ID có sẵn, bỏ qua bước tạo merchant")
    parser.add_argument("--admin-token", default=ADMIN_TOKEN, help=f"Admin token (mặc định: {ADMIN_TOKEN})")
    parser.add_argument("--limit",       type=int, default=None, help="Giới hạn số sản phẩm import")
    parser.add_argument("--skip-errors", action="store_true", help="Bỏ qua lỗi, tiếp tục import")
    args = parser.parse_args()

    print(f"\n{'='*55}")
    print(f"  UIT Store — Product Seeder")
    print(f"{'='*55}")
    print(f"  File   : {args.file}")
    print(f"  Service: {args.url}")

    # Test kết nối
    check_connection(args.url)

    # Detect dataset type sớm (cần để chọn merchant preset)
    try:
        df_peek = pd.read_csv(args.file, nrows=1, encoding="utf-8")
    except UnicodeDecodeError:
        df_peek = pd.read_csv(args.file, nrows=1, encoding="utf-8-sig")
    dtype = args.type or detect_dataset_type(df_peek)
    print(f"  Dataset: {dtype}")
    print(f"{'='*55}")

    # Bước 1: Tạo hoặc dùng merchant có sẵn
    if args.merchant_id:
        merchant_id = args.merchant_id
        print(f"\n[1/2] Dùng merchant ID có sẵn: {merchant_id}")
    else:
        merchant_id = create_or_get_merchant(args.url, dtype, args.admin_token)

    # Bước 2: Import sản phẩm
    import_products(
        csv_path=args.file,
        catalog_url=args.url,
        merchant_id=merchant_id,
        dataset_type=dtype,
        limit=args.limit,
        skip_errors=args.skip_errors,
    )


if __name__ == "__main__":
    main()
