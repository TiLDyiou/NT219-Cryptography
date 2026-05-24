# Review codebase services truoc khi thay doi hoac production deploy

Ngay review: 2026-05-25 theo timezone local cua workspace.

Pham vi: chi review cac thu muc trong `services/`. Khong sua source code. File nay la artifact review duy nhat duoc tao ra.

## Ket luan ngan

Codebase hien tai chua san sang de host production. Cac blocker lon nhat la:

1. `order-service` dang co Git conflict marker trong source va `requirements.txt`, nen build/import bang Docker se loi ngay.
2. Nhieu co che production-critical dang mac dinh o che do dev: HMAC/nonce tat, SQLite fallback bat, Vault/Kafka/Redis fallback sang local/in-memory/null adapter.
3. Auth hien tai phan lon la header trust-based hoac mock token. Neu expose service truc tiep, client co the gia mao user/merchant/admin.
4. `payment-service` co mismatch giua repository va SQLAlchemy model/migration, co nguy co loi runtime o luong charge/refund/get/webhook.
5. Mot so admin/internal endpoint khong co dependency auth rieng, chi trong cho HMAC middleware nhung middleware mac dinh tat.
6. Test suite khong dong nhat: co service pass, co service fail, co service khong collect duoc do thieu `pythonpath`.

## Ket qua xac minh nhanh

Da chay:

- `services/shipping-service`: `pytest -q` -> 18 passed.
- `services/noti-service`: `pytest -q` -> 9 passed.
- `services/catalog-service`: `python test_api.py` -> pass smoke test, sau do da khoi phuc `catalog.db` ve trang thai git sach.
- `services/order-service`: `pytest -q` -> 4 passed, 1 error. Loi test tai `services/order-service/tests/test_checkout.py:65` goi `CheckoutSagaOrchestrator(repo, payment, events)` trong khi constructor hien tai can them `event_publisher` tai `services/order-service/app/application/saga/orchestrator.py:24`.
- `services/payment-service`: `pytest -q` -> collection error `ModuleNotFoundError: No module named 'app'`; `pytest.ini` khong co `pythonpath = .`.
- `services/inventory-service`: `pytest -q` -> import `conftest.py` loi `ModuleNotFoundError: No module named 'app'`; `pytest.ini` khong co `pythonpath = .`.
- `services/cart-service`: `python test_api.py` -> fail assertion dau tien tai `services/cart-service/test_api.py:17`, vi test goi `GET /api/v1/user/carts/{merchant_id}` nhung router hien tai khong con endpoint do.

## Blocker P0 truoc production

### 1. `order-service` khong build duoc do merge conflict

Bang chung:

- `services/order-service/app/main.py:6`, `:11`, `:19`, `:25`, `:27`, `:31`, `:50`, `:51`, `:54` con conflict marker `<<<<<<<`, `=======`, `>>>>>>>`.
- `services/order-service/requirements.txt:4`, `:9`, `:21` con conflict marker.

Tac dong:

- Docker image copy `app` va chay `uvicorn app.main:app`; Python se gap syntax error khi import `app.main`.
- `pip install -r requirements.txt` cung co the fail vi file requirements khong hop le.

### 2. Auth hien tai khong dat muc production

Van de lap lai o nhieu service:

- `cart-service` tin `X-User-Id` hoac `Authorization: Bearer <anything>` lam user id tai `services/cart-service/app/api/dependencies.py:10-11`.
- `catalog-service` ghi ro mock JWT tai `services/catalog-service/app/api/dependencies.py:11`; `AUTH_SECRET_KEY` hard-code mock tai `services/catalog-service/app/core/config.py:16`.
- `inventory-service` tin `X-Merchant-Id` hoac bearer raw string tai `services/inventory-service/app/api/dependencies.py:33-34`.
- `shipping-service` tin `X-Merchant-Id`/`Authorization` va `X-Admin-Id`/`X-Admin-Scope` tai `services/shipping-service/app/api/dependencies.py:34-35`, `:47-48`.
- `payment-service` tin `X-User-Id` tai `services/payment-service/app/api/dependencies.py:24`.
- `order-service` tin `X-User-Id` hoac bearer raw string tai `services/order-service/app/api/dependencies.py:26-27`.

Tai sao nguy hiem: day la identity tu header, khong verify JWT, session, signature tu gateway, hoac token introspection. Neu service bi expose truc tiep, client co the tu gan user/merchant/admin.

### 3. HMAC/nonce co code nhung mac dinh tat

Bang chung:

- Middleware bo qua ngay neu config tat: `services/payment-service/app/api/middleware/hmac_verification.py:10`, `services/payment-service/app/api/middleware/nonce_guard.py:11`.
- Tuong tu: `inventory-service`, `shipping-service`, `noti-service`, `order-service`.
- Mac dinh config false: `services/payment-service/app/core/config.py:63-64`, `services/inventory-service/app/core/config.py:59-60`, `services/shipping-service/app/core/config.py:57-58`, `services/noti-service/app/core/config.py:74-75`, `services/order-service/app/core/config.py:83-87`.

Tac dong:

- Cac route internal/admin chi duoc bao ve boi HMAC se thanh public neu chay default.
- Nonce guard khong bat thi chong replay khong co tac dung.

### 4. Admin/internal endpoint co vung mo

Bang chung:

- Payment router mount admin settlement tai `services/payment-service/app/api/v1/router.py:11`, nhung endpoint `generate_settlement` va `process_settlement` tai `services/payment-service/app/api/v1/admin/settlements.py:12`, `:31` khong co admin dependency.
- Notification router chi include admin router tai `services/noti-service/app/api/v1/router.py:6`; admin router prefix `/admin` tai `services/noti-service/app/api/v1/admin/router.py:6`; endpoints `list_templates`, `upsert_template`, `retry_notification` tai `services/noti-service/app/api/v1/admin/templates.py:26`, `:32`, `services/noti-service/app/api/v1/admin/retry.py:13` khong co admin dependency.
- Inventory `/system/availability` tai `services/inventory-service/app/api/v1/system/routes.py` khong dung `verify_internal_token`, trong khi `/reservations/expire` co dung.

Tac dong:

- Neu HMAC middleware tat hoac bi bypass o gateway, admin operations co the bi goi truc tiep.

### 5. Payment repository/model mismatch

Bang chung:

- Model co `failure_code`, `failure_message`, `psp_transaction_id`: `services/payment-service/app/infrastructure/persistence/models/payment_transaction.py:20`, `:30-31`.
- Migration cung tao `failure_code`, `failure_message`, khong tao `client_secret`: `services/payment-service/alembic/versions/0001_initial_schema.py:57`, `:67-68`.
- Repository lai ghi `db_obj.error_code`, `db_obj.error_message`, `db_obj.client_secret`: `services/payment-service/app/infrastructure/persistence/repositories/payment_repository.py:28-30`.
- Insert moi truyen `client_secret=tx.client_secret`: `services/payment-service/app/infrastructure/persistence/repositories/payment_repository.py:53`.
- `_to_entity` doc `db_obj.client_secret`: `services/payment-service/app/infrastructure/persistence/repositories/payment_repository.py:126`.

Tac dong:

- SQLAlchemy mapped class khong khai bao cac attribute nay. Day la rui ro runtime ro rang khi luu/lay payment.
- Webhook/refund/get payment co the loi hoac mat du lieu loi thanh toan.

## Blocker P1 can xu ly truoc staging/production

### 1. SQLite fallback va `create_all` khong phu hop production

Bang chung:

- Default `ENABLE_SQLITE_FALLBACK=true`: `order-service` `services/order-service/app/core/config.py:65-66`, `payment-service` `services/payment-service/app/core/config.py:52`, `inventory-service` `services/inventory-service/app/core/config.py:47`, `shipping-service` `services/shipping-service/app/core/config.py:48`, `noti-service` `services/noti-service/app/core/config.py:65`.
- Runtime fallback sang SQLite: `services/payment-service/app/infrastructure/persistence/database.py:46`, `services/inventory-service/app/infrastructure/persistence/database.py:48`, `services/shipping-service/app/infrastructure/persistence/database.py:41`, `services/noti-service/app/infrastructure/persistence/database.py:40`, `services/order-service/app/infrastructure/persistence/database.py:49`.
- `cart-service` va `catalog-service` auto `Base.metadata.create_all`: `services/cart-service/app/core/database.py:37`, `services/catalog-service/app/core/database.py:38`.
- Alembic startup check la stub log-only: `services/payment-service/app/main.py:22`, `services/inventory-service/app/main.py:31`, `services/shipping-service/app/main.py:32`, `services/noti-service/app/main.py:34`.

Tac dong:

- Production co the am tham chay SQLite neu Postgres loi.
- Schema drift khong bi chan o startup.
- `create_all` khong thay the migration, dac biet voi partition/audit trigger.

### 2. Fallback adapter lam he thong "thanh cong gia"

Bang chung:

- Order payment/inventory client co `dev_stub_on_failure` default true: `services/order-service/app/core/config.py:40`, `:50`.
- Neu payment service loi, client tra thanh cong stub: `services/order-service/app/infrastructure/external/payment_client.py:100`.
- Neu inventory service loi, client tra reserved true stub: `services/order-service/app/infrastructure/external/inventory_client.py:107`.
- Payment payout luon dung `BankPayoutStub`: `services/payment-service/app/infrastructure/container.py:186`, class tai `services/payment-service/app/infrastructure/external/bank_payout_stub.py:8`.
- Shipping default mock carrier: `services/shipping-service/app/core/config.py:82`, factory tai `services/shipping-service/app/infrastructure/external/carrier_gateway_factory.py:16`.
- Notification thieu SMTP credentials thi dung `FakeEmailGateway`: `services/noti-service/app/infrastructure/container.py:158`.

Tac dong:

- Production co the tao order/payment/shipment/notification "thanh cong" ma khong co side effect that.
- RISK cao cho tien, ton kho, giao hang, email.

### 3. Secrets/dev config dang nam trong repo

Bang chung:

- `services/payment-service/.env` ton tai trong repo tree, chua `VAULT_TOKEN=dev-root-token`, mock Stripe keys, local crypto secret, internal token.
- Nhieu `.env.example` cung de dev token/root token/local secret de copy.
- File runtime DB ton tai: `services/order-service/order_service.db`, `services/order-service/test_order_service.db`, `services/cart-service/cart.db`, `services/catalog-service/catalog.db`.

Tac dong:

- De leak habit/sai cau hinh khi deploy.
- DB local trong repo co the chua du lieu test hoac PII neu dung nham.

### 4. CORS mo toan bo

Bang chung:

- `allow_origins=["*"]` xuat hien tai `order-service` `services/order-service/app/main.py:45`, `payment-service` `services/payment-service/app/main.py:73`, `inventory-service` `services/inventory-service/app/main.py:80`, `shipping-service` `services/shipping-service/app/main.py:85`, `noti-service` `services/noti-service/app/main.py:74`, `cart-service` `services/cart-service/app/main.py:29`, `catalog-service` `services/catalog-service/app/main.py:33`.

Tac dong:

- Neu credentials/cookie/internal headers duoc dung qua browser, CORS mo rong lam tang attack surface.
- Nen de gateway/API edge quan ly CORS, service noi bo nen han che origin hoac khong expose CORS.

## Service-by-service notes

### order-service

Trang thai: chua production-ready.

Can biet:

- Dang co merge conflict trong app entrypoint va requirements.
- Test checkout fail do test va constructor saga lech nhau.
- Auth la header/bearer raw string.
- Payment/inventory gateway co dev stub on failure. Day la tradeoff tot cho demo, rat nguy hiem cho production.
- Khong thay Docker copy alembic/migration cho order-service, trong khi service co persistence rieng. Neu can Postgres schema production, can chien luoc migration ro rang.

### payment-service

Trang thai: rui ro cao nhat ve business.

Can biet:

- Admin settlement route khong co admin dependency.
- Repository/model mismatch voi `client_secret`, `error_code`, `error_message`.
- Charge request cho `amount >= 0`; nen can xem lai co cho phep zero payment hay khong.
- Webhook signature Stripe co verify, nhung route HMAC chung bo qua Stripe webhook la hop ly; can dam bao `STRIPE_WEBHOOK_SECRET` that bat buoc trong production.
- Payout dang stub.
- Test khong collect duoc do thieu `pythonpath = .`.

### inventory-service

Trang thai: kien truc tot hon service cu, nhung default chua production.

Can biet:

- Co idempotency, outbox, audit, metrics, readiness.
- HMAC/nonce default false.
- SQLite fallback default true.
- System availability route khong yeu cau internal token.
- Test khong collect duoc khi chay truc tiep do thieu `pythonpath = .`.

### shipping-service

Trang thai: test pass, nhung default production chua an toan.

Can biet:

- 18 tests pass.
- Co admin dependency rieng cho provider/override, tot hon payment/noti.
- Merchant/admin identity van la header trust-based.
- Default carrier mock, GHN secret co default dev.
- Dockerfile `COPY . .` tai `services/shipping-service/Dockerfile:7` se copy ca test/cache/notes neu context la service dir; nen tighten truoc production.

### noti-service

Trang thai: test pass, nhung admin va delivery can khoa lai.

Can biet:

- 9 tests pass.
- Admin template/retry endpoints khong co admin dependency rieng.
- Neu thieu SMTP credentials thi dung fake email gateway.
- Co rate limiter/idempotency/outbox/retry worker, day la diem manh.
- README da noi production can bat HMAC/nonce, nhung config mac dinh trong code van false.
- Dockerfile co `USER app` va `HEALTHCHECK`, tot hon cac service con lai.

### cart-service

Trang thai: service demo/dev.

Can biet:

- Chi dung SQLite, khong Dockerfile, khong alembic.
- Auth la mock header/bearer raw.
- Smoke test hien fail vi endpoint cu trong test khong con ton tai.
- Auto `create_all` luc startup.

### catalog-service

Trang thai: service demo/dev.

Can biet:

- Smoke test pass.
- Auth mock, secret mock hard-code.
- Chi dung SQLite, khong Dockerfile, khong alembic.
- Money dung `float` cho `base_price`; nen doi sang decimal/fixed precision truoc production de tranh sai so tien.
- Auto `create_all` luc startup.

### ml-fraud-scoring

Khong thay file source trong output `rg --files services`. Neu day la service du kien co, hien tai no chua co implementation de review.

## Production readiness checklist de xu ly truoc khi host that

P0:

- Resolve merge conflict trong `order-service/app/main.py` va `order-service/requirements.txt`.
- Thay mock/header auth bang verify JWT/service identity that, hoac dam bao chi expose sau API gateway co signed identity header.
- Bat `REQUIRE_INBOUND_HMAC=true` va `REQUIRE_NONCE_GUARD=true` cho cac route internal/admin, dong thoi test lai client signing.
- Them auth dependency rieng cho payment admin settlements va notification admin routes.
- Sua payment repository/model/migration mismatch.
- Tat SQLite fallback trong production: `ENABLE_SQLITE_FALLBACK=false`.
- Loai bo dev stub success path trong production: payment/inventory stub, bank payout stub, fake email, mock carrier.

P1:

- Chay Alembic migration that khi deploy; thay `check_alembic_head()` stub bang check revision thuc.
- Khong auto `create_all` trong production.
- Tach config dev/staging/prod; khong commit `.env` that.
- Remove runtime DB/caches khoi repo hoac dam bao `.gitignore` chan chung.
- Dinh nghia CORS allowlist theo frontend domain that, hoac tat CORS o service noi bo.
- Them Dockerfile cho `cart-service`, `catalog-service` neu can deploy; harden cac Dockerfile con lai bang non-root user, healthcheck, dependency layer ro rang, khong `COPY . .` neu khong can.
- Chuan hoa pytest config `pythonpath = .` cho payment/inventory.
- Them CI chay `pytest`, import app, dependency audit, lint/syntax check.

P2:

- Bo sung structured logging nhat quan cho tat ca service, kem correlation id.
- Dinh nghia SLO/readiness/liveness rieng cho service co Kafka/Redis/Vault.
- Them contract tests giua order-payment-inventory-shipping-noti.
- Bo sung migration/test cho audit trigger, outbox worker, DLQ, retry, webhook duplicate/out-of-order.

## Dieu nen lam truoc khi viet feature moi

Thu tu toi uu:

1. Lam codebase import/build duoc: resolve conflict, fix payment model mismatch, fix test collection.
2. Khoa security boundary: auth that, HMAC/nonce bat, admin/internal route protected.
3. Khoa production config: no SQLite fallback, no stub success, no committed `.env`.
4. Chay full test va them CI gate.
5. Chi sau do moi thay doi business logic hoac host staging.

## Trang thai git sau review

Sau khi chay test, `catalog.db` bi smoke test thay doi va da duoc khoi phuc. `git status --short` cuoi cung sach truoc khi tao file review nay.
