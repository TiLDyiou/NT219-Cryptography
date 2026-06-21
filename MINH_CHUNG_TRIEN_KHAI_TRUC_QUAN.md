# Hướng Dẫn Chụp Minh Chứng Trực Quan Cho Báo Cáo

Tài liệu này chỉ dùng codebase và cấu hình triển khai làm nguồn sự thật. Không dùng các file `.md` có sẵn trong repo để suy ra hệ thống đã làm gì.

Mục tiêu: tạo nhiều ảnh đủ trực quan để người chấm nhìn vào biết hệ thống đang chạy thật, có dữ liệu runtime thật, và các cơ chế bảo mật được kích hoạt thật. Video chỉ là phụ lục đi kèm.

## 1. Nguyên Tắc Minh Chứng

### 1.1. Ảnh nào thuyết phục

Ảnh thuyết phục phải có ít nhất 2 trong 4 yếu tố sau:

1. Có URL hoặc địa chỉ hệ thống đang chạy, ví dụ frontend, Keycloak, Prometheus, Vault, Stripe test dashboard.
2. Có dữ liệu phát sinh sau thao tác thật, ví dụ `order_number`, `order_id`, `payment_id`, `psp_transaction_id`, `created_at`.
3. Có trạng thái runtime, ví dụ service `UP`, HTTP `200`, HTTP `401`, HTTP `403`, HTTP `429`, Vault unsealed, Kafka topic đang có event.
4. Có cùng một mã định danh xuất hiện ở nhiều nơi độc lập, ví dụ cùng một `order_id` xuất hiện trong UI, database, audit log, Stripe dashboard.

### 1.2. Ảnh nào không nên dùng

Không dùng các ảnh sau làm minh chứng chính:

1. Chụp source code.
2. Chụp đoạn cấu hình tĩnh rồi nói hệ thống đã chạy.
3. Chụp nội dung báo cáo hoặc tài liệu tự viết.
4. Chụp terminal chỉ `echo PASS` mà không có request/response thật.
5. Chụp Swagger/OpenAPI đơn lẻ. Swagger chỉ chứng minh có khai báo endpoint, không chứng minh endpoint chạy đúng.
6. Chụp log quá dài không thấy ID chung, không thấy timestamp, không thấy service liên quan.

### 1.3. Kỹ thuật quan trọng: một `RUN_ID` xuyên suốt

Trước khi chụp, tạo một mã demo duy nhất:

```bash
RUN_ID="NT219-$(date +%Y%m%d-%H%M)"
echo "$RUN_ID"
```

Khi checkout, nhập `RUN_ID` vào các trường dễ thấy:

1. Họ tên người nhận: `NT219 DEMO <RUN_ID>`.
2. Địa chỉ cụ thể: `Demo address <RUN_ID>`.
3. Nếu có trường ghi chú đơn hàng trong lần demo khác, cũng nhập `RUN_ID`.

Vì sao làm vậy:

1. UI sẽ hiển thị `RUN_ID`.
2. Database sẽ có order phát sinh gần thời điểm đó.
3. Nếu trường địa chỉ được mã hóa trong DB, bạn không thấy plaintext `RUN_ID` trong cột encrypted. Đây lại là bằng chứng tốt cho field-level encryption.
4. Người chấm thấy cùng một lần demo được nối qua nhiều ảnh, khó bị xem là ảnh rời rạc.

### 1.4. Quy tắc che thông tin nhạy cảm

Được giữ lại:

1. `order_number`, `order_id`, `payment_id`, `psp_transaction_id` dạng `cs_...`, `pi_...`.
2. HTTP status.
3. Tên service, port, database, topic.
4. Timestamp.
5. 4 số cuối thẻ test nếu Stripe hiển thị.

Phải che:

1. Access token, refresh token, ID token.
2. Vault root token, unseal key, AppRole secret id.
3. Stripe secret key, webhook secret.
4. Email, số điện thoại thật, địa chỉ thật.
5. Cookie trình duyệt.

Không cần che `RUN_ID` vì đó là dữ liệu demo.

## 2. Căn Cứ Từ Codebase

Phần này chỉ để bạn biết ảnh nào nên chụp. Không chụp phần này đưa vào báo cáo.

### 2.1. Frontend và luồng người dùng

Code frontend thể hiện:

1. `frontend/auth.js`: dùng OAuth2 Authorization Code + PKCE với Keycloak realm `nt219`, client `frontend-spa`.
2. `frontend/api.js`: frontend gọi các API:
   - `/api/v1/catalog/public/products`
   - `/api/v1/cart/user/carts`
   - `/api/v1/orders/user/orders/checkout`
   - `/api/v1/orders/user/orders`
   - `/api/v1/catalog/merchant/products`
   - `/api/v1/orders/merchant/orders`
3. `frontend/app.jsx`: luồng chính là load catalog, thêm giỏ, checkout, tạo order.
4. `frontend/screens/screens-checkout.jsx`: có màn hình giỏ hàng, thanh toán, đặt hàng thành công, danh sách đơn hàng.

Ảnh nên chụp từ frontend:

1. Trang chủ hiển thị sản phẩm từ Catalog Service.
2. Trang đăng nhập chuyển sang Keycloak.
3. Giỏ hàng.
4. Checkout có `RUN_ID`.
5. Đặt hàng thành công có `order_number`.
6. Danh sách đơn hàng của người dùng.
7. Seller Center hoặc Merchant Orders nếu tài khoản merchant có quyền.

### 2.2. Gateway và bảo vệ biên

Code cấu hình gateway thể hiện:

1. `services/envoy.yaml` và `infra/patches/envoy.yaml`: Envoy listener port `10000`, route các prefix:
   - `/auth/`
   - `/api/v1/catalog`
   - `/api/v1/cart`
   - `/api/v1/orders`
   - `/api/v1/inventory`
   - `/api/v1/shipping`
   - `/api/v1/notifications`
2. Envoy có local rate limit `100` request mỗi `60s`.
3. `infra/patches/waf.lua`: Lua WAF chặn SQLi, XSS, path traversal, scanner user-agent.
4. `infra/vm-setup/node-1/02-setup-ingress.sh`: Nginx phục vụ frontend, proxy `/api/` sang Envoy HTTPS `127.0.0.1:10000`, proxy `/auth/` sang Keycloak.

Ảnh nên chụp:

1. Nginx `/health`.
2. Envoy admin clusters hoặc stats.
3. Request SQLi/XSS bị `403`.
4. Flood request bị `429`.

### 2.3. Service và port runtime

Từ script triển khai:

1. NODE-1: Nginx `80`, Keycloak `8080`, Envoy `10000`, Envoy admin `9901`.
2. NODE-2:
   - catalog-service `8001`
   - cart-service `8002`
   - order-service `8003`
   - inventory-service `8005`
   - shipping-service `8007`
   - noti-service `8008`
3. NODE-3:
   - payment-service `8004`
   - Vault `8200`
4. NODE-4:
   - PostgreSQL `5432`
   - Kafka `9092`
   - Elasticsearch `9200`
   - Kibana `5601`
   - Prometheus `9090`
   - Grafana `3001` nếu chạy bằng compose, hoặc `3000` nếu chạy systemd theo script Ubuntu.

Ảnh nên chụp:

1. Prometheus Targets.
2. Terminal health check nhiều service.
3. Kafka topics.
4. PostgreSQL database list.

### 2.4. Auth, HMAC, Nonce, Vault, Stripe

Code service thể hiện:

1. Cart/order/inventory/shipping verify Bearer JWT từ Keycloak bằng RSA public key và thuật toán `RS256`.
2. Payment internal endpoints yêu cầu `X-Internal-Token`.
3. Payment/order/inventory/shipping/noti có middleware `NonceGuardMiddleware` và `HmacVerificationMiddleware`.
4. Payment webhook `/api/v1/webhooks/stripe` yêu cầu header `Stripe-Signature`.
5. Vault Transit được dùng cho:
   - envelope encryption field nhạy cảm
   - HMAC request service-to-service
   - ký event/audit
6. Order address model lưu:
   - `full_name_encrypted`
   - `phone_encrypted`
   - `email_encrypted`
   - `address_line1_encrypted`
7. Payment transaction model lưu Stripe reference như `psp_transaction_id`, không có cột số thẻ.
8. Audit log model có `hmac_signature` và `hmac_key_version`.

Ảnh nên chụp:

1. Keycloak login và URL PKCE.
2. API không token bị `401`.
3. Internal payment endpoint thiếu HMAC/internal token bị `401`.
4. Stripe webhook thiếu signature bị `400`.
5. Vault UI transit keys.
6. DB cột encrypted là binary/hex, không có plaintext `RUN_ID`.
7. Audit log có HMAC signature.

## 3. Bộ Ảnh Nên Chụp

Tổng thể nên có 24-32 ảnh. Nếu báo cáo bị giới hạn trang, dùng nhóm bắt buộc 14-16 ảnh trong thân báo cáo, còn lại đưa phụ lục.

### 3.1. Nhóm A: Hệ thống đang chạy thật

#### Ảnh A01 - Trang chủ frontend nhận dữ liệu từ Catalog Service

Vị trí chèn:

1. Chương Thiết kế hệ thống, sau phần kiến trúc tổng thể.
2. Hoặc Chương Thực nghiệm, phần môi trường triển khai.

Mục đích:

Chứng minh frontend không phải mock tĩnh: nó đang gọi backend và nhận danh sách sản phẩm.

Cách chụp:

1. Mở frontend qua URL triển khai thật, ví dụ `http://<NODE1_IP>/` hoặc URL tunnel HTTPS nếu có.
2. Đợi trang chủ load xong.
3. Chụp vùng gồm:
   - thanh địa chỉ trình duyệt
   - dòng trạng thái `Catalog Service kết nối thành công`
   - số lượng sản phẩm
   - lưới sản phẩm thật
4. Không mở DevTools ở ảnh này để ảnh sạch và trực quan.

Tiêu chí ảnh đạt:

1. Thấy URL không phải `file://`.
2. Thấy `Catalog Service` kết nối thành công.
3. Thấy nhiều sản phẩm có tên/giá/ảnh.

Caption gợi ý:

`Hình X: Frontend UIT Store đang chạy qua NODE-1 và nhận dữ liệu sản phẩm trực tiếp từ Catalog Service.`

#### Ảnh A02 - Health endpoint của Nginx ingress

Vị trí chèn:

Phần triển khai hạ tầng hoặc phụ lục minh chứng vận hành.

Mục đích:

Chứng minh request đi vào ingress thật, không chỉ mở frontend tĩnh.

Cách chụp:

1. Mở tab mới:

```text
http://<NODE1_IP>/health
```

1. Nếu dùng tunnel:

```text
https://<PUBLIC_URL>/health
```

1. Chụp cả thanh địa chỉ và JSON trả về.

Tiêu chí ảnh đạt:

1. HTTP response hiển thị `{"status":"OK","service":"nginx"}`.
2. Thanh địa chỉ là endpoint đang demo.

Caption gợi ý:

`Hình X: Nginx ingress trả health check thành công, xác nhận điểm vào hệ thống đang hoạt động.`

#### Ảnh A03 - Prometheus Targets hiển thị các service UP

Vị trí chèn:

1. Chương Thực nghiệm, mục môi trường triển khai.
2. Phụ lục nếu thân báo cáo thiếu chỗ.

Mục đích:

Chứng minh nhiều service đang chạy đồng thời, không phải chỉ frontend.

Cách chụp:

1. Mở Prometheus:

```text
http://<NODE4_IP>:9090/targets
```

1. Lọc hoặc kéo đến các target:
   - catalog-service
   - cart-service
   - order-service
   - inventory-service
   - shipping-service
   - notification-service
   - payment-service
2. Chụp màn hình thấy cột State là `UP`.

Tiêu chí ảnh đạt:

1. Ít nhất 6 service của NODE-2 là `UP`.
2. Payment-service `UP` nếu NODE-3 đã được Prometheus scrape.
3. Ảnh thấy rõ địa chỉ target và state.

Caption gợi ý:

`Hình X: Prometheus Targets ghi nhận các microservice đang ở trạng thái UP trong môi trường triển khai.`

#### Ảnh A04 - Grafana Explore với query `up`

Vị trí chèn:

Phụ lục hoặc Chương 4 nếu muốn tăng tính trực quan.

Mục đích:

Tạo ảnh đẹp hơn Prometheus raw targets, thể hiện quan sát runtime.

Cách chụp:

1. Mở Grafana:

```text
http://<NODE4_IP>:3001
```

hoặc:

```text
http://<NODE4_IP>:3000
```

1. Vào Explore.
2. Chọn datasource Prometheus.
3. Query:

```promql
up
```

1. Chụp bảng kết quả hoặc graph.

Tiêu chí ảnh đạt:

1. Query `up` trả nhiều series.
2. Service labels hoặc targets nhìn thấy rõ.

Caption gợi ý:

`Hình X: Grafana đọc dữ liệu Prometheus, thể hiện khả năng quan sát trạng thái runtime của các service.`

#### Ảnh A05 - Envoy admin clusters hoặc stats

Vị trí chèn:

1. Phần API Gateway.
2. Phần Trust Boundary hoặc ranh giới giữa ingress và service mesh.

Mục đích:

Chứng minh API không đi thẳng vào service mà qua Envoy gateway.

Cách chụp:

Không dùng URL frontend/ngrok dạng:

```text
https://<PUBLIC_URL>/clusters
https://<PUBLIC_URL>/stats
```

Lý do: tunnel frontend thường đi vào Nginx port `80`. Nginx chỉ proxy `/api/` sang Envoy data-plane và `/auth/` sang Keycloak; các path như `/clusters` hoặc `/stats` sẽ rơi về SPA `index.html`, nên bạn sẽ thấy trang chủ. Envoy admin là control-plane nội bộ, không nên expose public.

Cách đúng 1 - chụp terminal ngay trên NODE-1:

```bash
curl -s http://127.0.0.1:9901/clusters | grep -E "catalog_service|cart_service|order_service|inventory_service|shipping_service|notification_service" -A2
curl -s http://127.0.0.1:9901/stats | grep -E "cluster\\.(catalog|cart|order|inventory|shipping|notification)_service" | head -40
```

Chụp terminal thấy cluster name và endpoint port.

Cách đúng 2 - mở bằng browser qua SSH local port-forward:

```bash
ssh -L 9901:127.0.0.1:9901 user@<NODE1_IP>
```

Sau đó trên máy của bạn mở:

```text
http://127.0.0.1:9901/clusters
```

hoặc:

```text
http://127.0.0.1:9901/stats
```

1. Nếu `/clusters` quá dài, dùng trình duyệt search các cluster:
   - `catalog_service`
   - `cart_service`
   - `order_service`
   - `payment` nếu có route riêng thì chụp; nếu không có thì không ép.
2. Chụp thấy cluster name và endpoint IP/port.

Tiêu chí ảnh đạt:

1. Có ít nhất 3 cluster ứng dụng.
2. Có endpoint port tương ứng `8001`, `8002`, `8003`, `8005`, `8007`, `8008`.

Caption gợi ý:

`Hình X: Envoy admin endpoint hiển thị các cluster backend được route từ API Gateway sang service mesh.`

#### Ảnh A06 - Terminal health check nhiều service trên NODE-2

Vị trí chèn:

Phụ lục triển khai hoặc Chương 4.1.

Mục đích:

Chứng minh các process service thật đang chạy trên node backend.

Cách chụp:

Trên NODE-2 chạy:

```bash
systemctl is-active catalog-service cart-service order-service inventory-service shipping-service noti-service
for p in 8001 8002 8003 8005 8007 8008; do
  printf ":%s " "$p"
  curl -s "http://localhost:$p/health"
  printf "\n"
done
```

Chụp terminal vừa đủ thấy:

1. tên service
2. `active`
3. JSON `/health`
4. prompt user/node nếu có

Tiêu chí ảnh đạt:

1. Không chỉ có `systemctl status` một service.
2. Thấy nhiều service cùng lúc.
3. Có `/health` thật.

Caption gợi ý:

`Hình X: NODE-2 chạy sáu microservice chính và các endpoint /health trả phản hồi thành công.`

#### Ảnh A07 - Terminal health check NODE-1, NODE-3, NODE-4

Vị trí chèn:

Phụ lục triển khai.

Mục đích:

Chứng minh các node hạ tầng chính chạy đồng thời.

Cách chụp:

Chụp theo 3 terminal hoặc 3 ảnh riêng:

NODE-1:

```bash
systemctl is-active nginx keycloak envoy
curl -s http://localhost/health
curl -k -s -o /dev/null -w "Envoy HTTPS: %{http_code}\n" https://127.0.0.1:10000/api/v1/catalog/public/products
```

NODE-3:

```bash
systemctl is-active vault payment-service
curl -s http://127.0.0.1:8200/v1/sys/health
curl -s http://127.0.0.1:8004/health
```

NODE-4:

```bash
systemctl is-active postgresql kafka prometheus grafana-server 2>/dev/null || true
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | head -20
```

Tiêu chí ảnh đạt:

1. Ảnh không lộ secret.
2. Có trạng thái `active` hoặc container `Up`.
3. Có health JSON hoặc HTTP status.

Caption gợi ý:

`Hình X: Trạng thái runtime của ingress, payment/Vault và data/observability node.`

#### Ảnh A08 - Kafka topics

Vị trí chèn:

Phần message bus hoặc checkout saga.

Mục đích:

Chứng minh message bus đang tồn tại và có các topic liên quan.

Cách chụp:

Trên NODE-4 nếu chạy Kafka systemd:

```bash
/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```

Nếu chạy Docker Compose:

```bash
docker exec node4-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

Chụp danh sách topic có ít nhất:

```text
order-commands
order-events
inventory-commands
payment-commands
notification-events
```

Nếu tên topic thực tế khác do env, chụp đúng topic thực tế đang chạy.

Tiêu chí ảnh đạt:

1. Thấy lệnh và output.
2. Thấy Kafka host/container thật.
3. Thấy nhiều topic nghiệp vụ.

Caption gợi ý:

`Hình X: Kafka broker đang chạy và có các topic phục vụ luồng event giữa các service.`

#### Ảnh A09 - PostgreSQL có nhiều database service

Vị trí chèn:

Phần triển khai data layer hoặc phụ lục.

Mục đích:

Chứng minh mỗi service có database riêng, không chỉ một database đơn giản.

Cách chụp:

Trên NODE-4:

```bash
psql -U uitstore -h localhost -p 5432 -l
```

Nếu chạy Docker:

```bash
docker exec -it node4-postgres psql -U uitstore -l
```

Chụp danh sách database:

1. `catalog_db`
2. `cart_db`
3. `order_db`
4. `payment_db`
5. `inventory_db`
6. `shipping_db`
7. `notification_db`

Tiêu chí ảnh đạt:

1. Thấy nhiều database theo service.
2. Không lộ mật khẩu.

Caption gợi ý:

`Hình X: PostgreSQL trên NODE-4 chứa các database tách riêng cho từng microservice.`

### 3.2. Nhóm B: Xác thực và bảo vệ truy cập

#### Ảnh B01 - Keycloak login qua `/auth`

Vị trí chèn:

Phần OAuth2/OIDC + PKCE.

Mục đích:

Chứng minh frontend không tự xử lý mật khẩu mà redirect sang Keycloak.

Cách chụp:

1. Mở frontend.
2. Bấm đăng nhập.
3. Khi trình duyệt chuyển sang Keycloak, chụp màn hình login.
4. Chụp cả thanh địa chỉ có `/auth/realms/nt219/protocol/openid-connect/auth`.
5. Nếu URL có `code_challenge_method=S256`, để nó hiện rõ nếu không quá dài.

Tiêu chí ảnh đạt:

1. Thấy domain/host triển khai thật.
2. Thấy realm `nt219` hoặc đường dẫn Keycloak.
3. Không chụp mật khẩu.

Caption gợi ý:

`Hình X: Frontend chuyển người dùng sang Keycloak để đăng nhập bằng OAuth2 Authorization Code + PKCE.`

#### Ảnh B02 - Sau đăng nhập frontend gọi API có Authorization Bearer

Vị trí chèn:

Phần xác thực/ủy quyền.

Mục đích:

Chứng minh request user-facing dùng JWT thật.

Cách chụp:

1. Đăng nhập xong.
2. Mở DevTools > Network.
3. Reload trang hoặc vào giỏ hàng.
4. Chọn request:

```text
/api/v1/cart/user/carts
```

hoặc:

```text
/api/v1/orders/user/orders
```

1. Chụp:
   - request URL
   - status `200`
   - header `Authorization: Bearer ...` nhưng che phần token
   - response preview có `success: true`

Tiêu chí ảnh đạt:

1. Token bị che.
2. URL API thật.
3. Status `200`.

Caption gợi ý:

`Hình X: Sau khi đăng nhập, frontend gửi Bearer JWT tới API protected và nhận phản hồi thành công.`

#### Ảnh B03 - Không có token thì bị từ chối

Vị trí chèn:

Phần xác thực/ủy quyền hoặc Chương 4 security experiments.

Mục đích:

Chứng minh API protected không mở public.

Cách chụp:

Mở terminal và chạy:

```bash
BASE="http://<NODE1_IP>"
curl -i "$BASE/api/v1/cart/user/carts"
curl -i "$BASE/api/v1/orders/user/orders"
```

Nếu dùng tunnel:

```bash
BASE="https://<PUBLIC_URL>"
curl -i -H "ngrok-skip-browser-warning: true" "$BASE/api/v1/cart/user/carts"
```

Chụp status `401` và body lỗi.

Tiêu chí ảnh đạt:

1. Thấy URL protected.
2. Thấy HTTP `401`.
3. Không dùng ảnh source code để giải thích.

Caption gợi ý:

`Hình X: API giỏ hàng/đơn hàng từ chối request không có Bearer JWT.`

#### Ảnh B04 - Merchant/Seller page cần đăng nhập

Vị trí chèn:

Phần RBAC hoặc frontend workflow.

Mục đích:

Chứng minh UI không chỉ là shopper flow mà còn có khu seller dùng dữ liệu backend.

Cách chụp:

1. Đăng xuất.
2. Vào Seller Center.
3. Chụp màn hình yêu cầu đăng nhập.
4. Đăng nhập bằng tài khoản merchant.
5. Chụp Seller Dashboard hoặc Merchant Orders có dữ liệu.

Tiêu chí ảnh đạt:

1. Có trạng thái chưa đăng nhập bị chặn.
2. Có trạng thái sau đăng nhập thấy dashboard/dữ liệu.

Caption gợi ý:

`Hình X: Seller Center yêu cầu đăng nhập và hiển thị dữ liệu người bán sau khi xác thực.`

### 3.3. Nhóm C: Luồng mua hàng end-to-end

Đây là nhóm ảnh quan trọng nhất. Nếu báo cáo chỉ có chỗ cho ít ảnh, ưu tiên nhóm này.

#### Ảnh C01 - Sản phẩm thật từ Catalog

Vị trí chèn:

Phần mô tả luồng nghiệp vụ hoặc checkout flow.

Mục đích:

Chứng minh order bắt đầu từ catalog thật.

Cách chụp:

1. Trang chủ hoặc chi tiết sản phẩm.
2. Chụp rõ:
   - tên sản phẩm
   - giá
   - merchant/shop nếu UI có
   - nút thêm giỏ/mua ngay

Tiêu chí ảnh đạt:

1. Sản phẩm có giá rõ.
2. Không dùng dữ liệu giả trên file local.

Caption gợi ý:

`Hình X: Người dùng chọn sản phẩm được trả về từ Catalog Service.`

#### Ảnh C02 - Giỏ hàng sau khi thêm sản phẩm

Vị trí chèn:

Phần checkout flow.

Mục đích:

Chứng minh Cart Service đã nhận/đồng bộ sản phẩm.

Cách chụp:

1. Thêm sản phẩm vào giỏ.
2. Mở giỏ hàng.
3. Chụp rõ:
   - tên sản phẩm
   - số lượng
   - đơn giá
   - tổng tiền
   - tên shop/merchant nếu có

Tăng độ thuyết phục:

Mở DevTools Network song song và chụp request:

```text
POST /api/v1/cart/user/carts/<merchant_id>/items
```

Status nên là `200`.

Caption gợi ý:

`Hình X: Giỏ hàng hiển thị sản phẩm đã thêm và phản ánh dữ liệu đồng bộ từ Cart Service.`

#### Ảnh C03 - Checkout có `RUN_ID`

Vị trí chèn:

Phần checkout flow hoặc phần mã hóa dữ liệu nhạy cảm.

Mục đích:

Tạo điểm nối giữa UI và database.

Cách chụp:

1. Vào checkout.
2. Nhập:
   - Họ tên: `NT219 DEMO <RUN_ID>`
   - Số điện thoại demo: `0900000000`
   - Email demo: `nt219-demo@example.test`
   - Địa chỉ: `Demo address <RUN_ID>`
   - Thành phố: `Ho Chi Minh`
3. Chọn COD nếu muốn nhanh và ổn định.
4. Chọn credit card nếu muốn chứng minh Stripe Checkout.
5. Chụp rõ:
   - thông tin nhận hàng có `RUN_ID`
   - phương thức thanh toán
   - tổng tiền
   - nút đặt hàng

Tiêu chí ảnh đạt:

1. `RUN_ID` nhìn rõ.
2. Có tổng tiền.
3. Có phương thức thanh toán.

Caption gợi ý:

`Hình X: Checkout sử dụng dữ liệu demo có RUN_ID để theo dõi xuyên suốt từ UI tới database và audit log.`

#### Ảnh C04 - DevTools request checkout thành công

Vị trí chèn:

Phần checkout flow hoặc Chương 4 thực nghiệm.

Mục đích:

Chứng minh nút đặt hàng thật sự gọi Order Service.

Cách chụp:

1. Mở DevTools > Network trước khi bấm đặt hàng.
2. Bấm đặt hàng.
3. Chọn request:

```text
POST /api/v1/orders/user/orders/checkout
```

1. Chụp rõ:
   - Request URL
   - Status `200`
   - Response có `order_group_id`, `parent_order_number`, `orders`
   - Header `Idempotency-Key`
   - Header `Authorization` đã che token

Tiêu chí ảnh đạt:

1. Có HTTP `200`.
2. Có `parent_order_number`.
3. Có ít nhất một `order_id`.

Caption gợi ý:

`Hình X: Frontend gọi Order Service checkout và nhận order_group_id cùng order_number từ backend.`

#### Ảnh C05 - Màn hình đặt hàng thành công

Vị trí chèn:

Ngay sau sequence diagram checkout hoặc phần kết quả thực nghiệm.

Mục đích:

Đây là ảnh trực quan nhất với người không đọc kỹ thuật.

Cách chụp:

1. Sau checkout thành công, chụp màn hình `Đặt hàng thành công`.
2. Chụp rõ:
   - `order_number`
   - trạng thái đơn
   - sản phẩm
   - tổng tiền
   - thông tin nhận hàng nếu UI hiển thị

Tiêu chí ảnh đạt:

1. `order_number` nhìn rõ.
2. Tổng tiền khớp giỏ hàng.
3. Không có thông tin thật của người dùng.

Caption gợi ý:

`Hình X: Đơn hàng được tạo thành công sau khi frontend gọi Order Service qua gateway.`

#### Ảnh C06 - Danh sách đơn hàng của người dùng

Vị trí chèn:

Phần user workflow hoặc phụ lục.

Mục đích:

Chứng minh order không chỉ hiện ở màn hình success tạm thời, mà được lưu và đọc lại từ backend.

Cách chụp:

1. Vào mục Đơn hàng của tôi.
2. Chụp đơn mới nhất.
3. Đảm bảo `order_number` trùng với ảnh C05.

Tiêu chí ảnh đạt:

1. Cùng `order_number`.
2. Có status, tổng tiền, ngày tạo.

Caption gợi ý:

`Hình X: Đơn hàng vừa tạo được lưu và truy xuất lại qua API danh sách đơn hàng.`

#### Ảnh C07 - Merchant Orders thấy đơn của khách

Vị trí chèn:

Phần microservices workflow hoặc Seller Center.

Mục đích:

Chứng minh cùng một order được nhìn từ vai trò merchant.

Cách chụp:

1. Đăng nhập tài khoản merchant tương ứng.
2. Vào Seller Center > Đơn hàng.
3. Chụp order mới nhất hoặc search theo `order_number`.
4. Nếu có nút xác nhận đơn, chụp trước khi bấm.

Tiêu chí ảnh đạt:

1. Có cùng `order_number`.
2. Có status và tổng tiền.
3. Có sản phẩm trong đơn.

Caption gợi ý:

`Hình X: Seller Center đọc cùng đơn hàng từ Order Service dưới góc nhìn người bán.`

#### Ảnh C08 - Xác nhận đơn bởi merchant

Vị trí chèn:

Phần trạng thái đơn hoặc checkout saga.

Mục đích:

Chứng minh trạng thái đơn có thể thay đổi qua API backend.

Cách chụp:

1. Ở Merchant Orders, bấm xác nhận đơn nếu trạng thái cho phép.
2. Chụp thông báo thành công hoặc trạng thái chuyển sang `Đã xác nhận`.
3. Nếu muốn mạnh hơn, chụp DevTools request:

```text
POST /api/v1/orders/merchant/orders/<order_id>/confirm
```

Tiêu chí ảnh đạt:

1. Trạng thái thay đổi rõ.
2. Cùng `order_number`.

Caption gợi ý:

`Hình X: Người bán xác nhận đơn hàng và trạng thái được cập nhật qua Order Service.`

### 3.4. Nhóm D: Database chứng minh dữ liệu thật

Các ảnh DB nên chụp bằng DBeaver/pgAdmin nếu muốn trực quan. Terminal `psql` cũng được, nhưng nên phóng to font và crop gọn.

#### Ảnh D01 - Bảng `orders` có order vừa tạo

Vị trí chèn:

Phần checkout flow hoặc thực nghiệm.

Mục đích:

Chứng minh order đã được ghi vào database runtime.

Cách chụp:

Chạy trong `order_db`:

```sql
SELECT
  order_number,
  id,
  order_group_id,
  parent_order_id,
  status,
  payment_method_type,
  total_amount,
  item_count,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

Chụp hàng có `order_number` trùng ảnh C05.

Tiêu chí ảnh đạt:

1. `order_number` trùng UI.
2. Có `id` hoặc `order_group_id`.
3. Có `status`, `total_amount`, `created_at`.

Caption gợi ý:

`Hình X: Bản ghi đơn hàng trong order_db khớp với order_number vừa tạo trên frontend.`

#### Ảnh D02 - Bảng `order_items` có sản phẩm trong đơn

Vị trí chèn:

Phần checkout flow hoặc phụ lục.

Mục đích:

Chứng minh chi tiết sản phẩm được lưu theo order.

Cách chụp:

Lấy `id` của child order từ D01, sau đó chạy:

```sql
SELECT
  order_id,
  product_id,
  sku,
  product_name,
  quantity,
  unit_price,
  line_total
FROM order_items
WHERE order_id = '<CHILD_ORDER_ID>';
```

Tiêu chí ảnh đạt:

1. `order_id` trùng child order.
2. Tên sản phẩm và giá khớp UI.

Caption gợi ý:

`Hình X: Chi tiết sản phẩm của đơn hàng được lưu trong bảng order_items.`

#### Ảnh D03 - Địa chỉ được mã hóa trong `order_addresses`

Vị trí chèn:

Phần Field-Level Encryption hoặc bảo vệ dữ liệu lưu trữ.

Mục đích:

Chứng minh PII không lưu plaintext trong DB.

Cách chụp:

Chạy trong `order_db`:

```sql
SELECT
  order_id,
  address_type,
  city,
  length(full_name_encrypted) AS full_name_bytes,
  encode(substring(full_name_encrypted from 1 for 24), 'hex') AS full_name_hex_prefix,
  length(phone_encrypted) AS phone_bytes,
  encode(substring(address_line1_encrypted from 1 for 24), 'hex') AS address_hex_prefix,
  created_at
FROM order_addresses
WHERE order_id = '<CHILD_ORDER_ID>';
```

Nếu dùng DBeaver, mở bảng `order_addresses` và chọn hiển thị binary dạng hex.

Tiêu chí ảnh đạt:

1. Không thấy `NT219 DEMO` trong cột encrypted.
2. Có `city` plaintext để chứng minh đúng row.
3. Có bytes/hex của trường encrypted.

Caption gợi ý:

`Hình X: Các trường PII của địa chỉ giao hàng được lưu dưới dạng binary ciphertext, trong khi dữ liệu ít nhạy cảm như city vẫn đọc được.`

#### Ảnh D04 - API đọc lại order giải mã được địa chỉ

Vị trí chèn:

Ngay sau ảnh D03.

Mục đích:

Chứng minh dữ liệu không chỉ bị mã hóa, mà ứng dụng giải mã đúng khi user hợp lệ đọc lại.

Cách chụp:

1. Dùng UI mở chi tiết đơn hàng nếu UI hiển thị địa chỉ.
2. Hoặc dùng DevTools/terminal gọi:

```bash
curl -s "$BASE/api/v1/orders/user/orders/<ORDER_ID>" \
  -H "Authorization: Bearer <ACCESS_TOKEN_DA_CHE>" \
  -H "X-Timestamp: $(date +%s)" \
  -H "X-Nonce: $(uuidgen)"
```

Không chụp token thật. Nếu dùng terminal, che token trong lệnh hoặc dùng biến môi trường:

```bash
curl -s "$BASE/api/v1/orders/user/orders/<ORDER_ID>" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Timestamp: $(date +%s)" \
  -H "X-Nonce: $(uuidgen)"
```

Chụp response có shipping address đã giải mã.

Tiêu chí ảnh đạt:

1. UI/API đọc được dữ liệu đúng.
2. D03 chứng minh DB không lưu plaintext.
3. Hai ảnh dùng cùng `order_id`.

Caption gợi ý:

`Hình X: Ứng dụng giải mã địa chỉ hợp lệ khi user đã xác thực truy xuất chi tiết đơn hàng.`

#### Ảnh D05 - Bảng `saga_state`

Vị trí chèn:

Phần Saga Pattern.

Mục đích:

Chứng minh hệ thống lưu trạng thái saga thay vì chỉ tạo order đơn giản.

Cách chụp:

```sql
SELECT
  order_id,
  saga_type,
  current_step,
  status,
  steps_completed,
  steps_remaining,
  retry_count,
  updated_at
FROM saga_state
WHERE order_id = '<CHILD_ORDER_ID>';
```

Tiêu chí ảnh đạt:

1. `order_id` trùng order.
2. Có `saga_type = checkout`.
3. Có `status`, `steps_completed`, `steps_remaining`.

Caption gợi ý:

`Hình X: Trạng thái checkout saga được lưu riêng trong bảng saga_state cho đơn hàng vừa tạo.`

#### Ảnh D06 - Audit log của order có HMAC signature

Vị trí chèn:

Phần append-only/audit integrity.

Mục đích:

Chứng minh nghiệp vụ sinh audit log có chữ ký/HMAC.

Cách chụp:

```sql
SELECT
  table_name,
  record_id,
  action,
  changed_fields,
  left(hmac_signature, 32) AS hmac_prefix,
  hmac_key_version,
  created_at
FROM order_audit_log
WHERE record_id = '<CHILD_ORDER_ID>'
ORDER BY created_at DESC;
```

Tiêu chí ảnh đạt:

1. `record_id` trùng order.
2. `action` có `INSERT` hoặc `UPDATE`.
3. `hmac_signature` không rỗng.

Caption gợi ý:

`Hình X: Audit log của Order Service ghi nhận thay đổi đơn hàng và kèm HMAC signature để phát hiện chỉnh sửa.`

#### Ảnh D07 - Payment transaction khớp order

Vị trí chèn:

Phần thanh toán hoặc PSP tokenization.

Mục đích:

Chứng minh payment-service đã ghi transaction cho order.

Điều kiện:

Ảnh này rõ nhất khi checkout bằng credit card qua Stripe. Nếu demo bằng COD và payment-service không tạo transaction, bỏ ảnh này hoặc chuyển sang ảnh D01-D06.

Cách chụp trong `payment_db`:

```sql
SELECT
  id AS payment_id,
  order_id,
  status,
  amount,
  currency_code,
  psp_provider,
  psp_transaction_id,
  left(client_secret, 30) AS client_secret_prefix,
  created_at,
  updated_at
FROM payment_transactions
WHERE order_id = '<PARENT_OR_CHILD_ORDER_ID>'
ORDER BY created_at DESC;
```

Tiêu chí ảnh đạt:

1. `order_id` trùng order.
2. `psp_provider = stripe`.
3. `psp_transaction_id` dạng `cs_...` hoặc `pi_...` nếu Stripe trả về.
4. Không có số thẻ.

Caption gợi ý:

`Hình X: Payment Service lưu transaction theo order_id và chỉ lưu định danh PSP của Stripe, không lưu số thẻ.`

#### Ảnh D08 - Payment audit log có HMAC signature

Vị trí chèn:

Phần audit integrity hoặc payment security.

Mục đích:

Chứng minh payment-service ghi audit cho thay đổi giao dịch.

Cách chụp trong `payment_db`:

```sql
SELECT
  table_name,
  record_id,
  action,
  changed_fields,
  left(hmac_signature, 32) AS hmac_prefix,
  hmac_key_version,
  created_at
FROM payment_audit_log
ORDER BY created_at DESC
LIMIT 10;
```

Tiêu chí ảnh đạt:

1. Có row liên quan `payment_transactions`.
2. Có `hmac_signature`.
3. Timestamp gần lúc demo.

Caption gợi ý:

`Hình X: Payment audit log ghi nhận thay đổi giao dịch và kèm HMAC signature.`

#### Ảnh D09 - Payment DB không lưu PAN

Vị trí chèn:

Phần PCI/tokenization.

Mục đích:

Chứng minh database không có dữ liệu thẻ thô.

Cách chụp:

Trong `payment_db`, chụp query:

```sql
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('payment_transactions', 'payment_methods')
ORDER BY table_name, ordinal_position;
```

Nếu bảng `payment_methods` có dữ liệu:

```sql
SELECT
  method_type,
  psp_provider,
  psp_payment_method_id,
  card_last4,
  card_brand,
  length(billing_name_encrypted) AS billing_name_bytes
FROM payment_methods
ORDER BY created_at DESC
LIMIT 10;
```

Tiêu chí ảnh đạt:

1. Không có cột chứa số thẻ đầy đủ.
2. Nếu có `psp_payment_method_id`, nó là định danh PSP như `pm_...`, không phải PAN.
3. `card_last4` nếu có chỉ là 4 số cuối.

Caption gợi ý:

`Hình X: Payment database chỉ lưu định danh PSP và metadata an toàn, không lưu số thẻ đầy đủ.`

### 3.5. Nhóm E: Vault, mã hóa và khóa

#### Ảnh E01 - Vault UI trạng thái unsealed

Vị trí chèn:

Phần Key Management/KMS.

Mục đích:

Chứng minh Vault đang chạy thật.

Cách chụp:

1. Mở:

```text
http://<NODE3_IP>:8200/ui/
```

1. Đăng nhập bằng token demo nếu được phép.
2. Chụp trạng thái Vault đã unsealed hoặc trang secrets engines.
3. Che token nếu nó xuất hiện.

Tiêu chí ảnh đạt:

1. Thấy Vault UI hoặc health.
2. Không lộ root token.

Caption gợi ý:

`Hình X: HashiCorp Vault đang chạy ở NODE-3 và ở trạng thái sẵn sàng phục vụ crypto operations.`

#### Ảnh E02 - Vault Transit keys

Vị trí chèn:

Phần Envelope Encryption/HMAC/signing.

Mục đích:

Chứng minh có key material được quản lý qua Vault Transit.

Cách chụp:

Trong Vault UI:

1. Vào Secrets Engines.
2. Chọn `transit`.
3. Chụp danh sách key có các tên như:
   - `order-fle-key`
   - `order-hmac-key`
   - `order-sign-key`
   - `payment-fle-key`
   - `payment-sign-key`
   - `payment-audit-key`
   - `shipping-fle-key`
4. Nếu không dùng UI, dùng terminal:

```bash
export VAULT_ADDR=http://127.0.0.1:8200
vault list transit/keys
```

Che `VAULT_TOKEN`.

Tiêu chí ảnh đạt:

1. Thấy nhiều key theo service.
2. Không lộ secret.

Caption gợi ý:

`Hình X: Vault Transit quản lý các khóa FLE, HMAC và ký event cho từng service.`

#### Ảnh E03 - Chi tiết một transit key

Vị trí chèn:

Phần Key Management.

Mục đích:

Chứng minh key có type và version, không chỉ là tên.

Cách chụp:

Terminal:

```bash
vault read transit/keys/order-fle-key
vault read transit/keys/payment-sign-key
```

Chỉ chụp:

1. name
2. type
3. latest_version
4. supports_encryption hoặc supports_signing nếu Vault hiển thị

Không chụp token.

Caption gợi ý:

`Hình X: Chi tiết Vault Transit key cho thấy loại khóa và version đang được sử dụng.`

#### Ảnh E04 - DB ciphertext và UI plaintext đặt cạnh nhau

Vị trí chèn:

Phần mã hóa dữ liệu lưu trữ.

Mục đích:

Đây là ảnh cực mạnh: một bên DB không đọc được PII, một bên app đọc được sau xác thực.

Cách chụp:

1. Bên trái màn hình: DBeaver/psql query D03 với hex ciphertext.
2. Bên phải màn hình: UI chi tiết đơn hàng hiển thị tên/địa chỉ demo.
3. Cùng `order_id` hoặc `order_number`.
4. Chụp cả hai nửa màn hình.

Tiêu chí ảnh đạt:

1. UI thấy `RUN_ID`.
2. DB không thấy `RUN_ID`, chỉ thấy hex/binary.
3. Cùng `order_id`/`order_number`.

Caption gợi ý:

`Hình X: Cùng một đơn hàng: ứng dụng hiển thị địa chỉ sau giải mã, còn database chỉ lưu ciphertext ở các trường PII.`

### 3.6. Nhóm F: Stripe và tokenization

#### Ảnh F01 - Chọn thanh toán thẻ và chuyển sang Stripe Checkout

Vị trí chèn:

Phần PSP tokenization hoặc payment flow.

Mục đích:

Chứng minh thẻ được nhập ở Stripe, không nhập trực tiếp trong app.

Cách chụp:

1. Checkout chọn `Thẻ tín dụng / ghi nợ`.
2. Bấm đặt hàng.
3. Khi chuyển sang Stripe Checkout, chụp trang Stripe.
4. Chụp rõ:
   - domain Stripe
   - số tiền
   - order/product nếu hiển thị
5. Không chụp thông tin thẻ thật. Chỉ dùng thẻ test.

Tiêu chí ảnh đạt:

1. URL là Stripe.
2. Số tiền khớp UI.
3. App không có form nhập số thẻ nội bộ.

Caption gợi ý:

`Hình X: Người dùng được chuyển sang Stripe Checkout để nhập thông tin thẻ, giúp hệ thống nội bộ không xử lý PAN.`

#### Ảnh F02 - Stripe test dashboard có giao dịch cùng order

Vị trí chèn:

Phần payment/result.

Mục đích:

Chứng minh giao dịch thanh toán là thật trong môi trường Stripe test.

Cách chụp:

1. Mở Stripe Dashboard ở chế độ test.
2. Tìm Payment/Checkout Session mới nhất.
3. Chụp rõ:
   - status
   - amount
   - `client_reference_id` hoặc metadata `order_id` nếu hiển thị
   - `cs_...` hoặc `pi_...`
4. Che API keys và email thật.

Tiêu chí ảnh đạt:

1. Số tiền khớp order.
2. Có `order_id` hoặc reference khớp DB.
3. Dashboard đang ở test mode.

Caption gợi ý:

`Hình X: Stripe test dashboard ghi nhận Checkout Session/PaymentIntent tương ứng với order_id vừa tạo.`

#### Ảnh F03 - DB payment chỉ có PSP reference

Vị trí chèn:

Ngay sau F02.

Mục đích:

Ghép Stripe dashboard với payment database để chứng minh tokenization.

Cách chụp:

Chụp D07 hoặc D09, nhưng đặt cạnh F02 nếu có thể.

Tiêu chí ảnh đạt:

1. `psp_transaction_id` trong DB khớp `cs_...` hoặc `pi_...` từ Stripe.
2. Không có số thẻ.

Caption gợi ý:

`Hình X: Payment database chỉ lưu tham chiếu PSP của Stripe, không lưu dữ liệu thẻ đầy đủ.`

### 3.7. Nhóm G: Kiểm thử bảo mật trực quan

#### Ảnh G01 - WAF chặn SQL injection

Vị trí chèn:

Chương 4, phần security experiments hoặc gateway hardening.

Mục đích:

Chứng minh Lua WAF ở Envoy đang chặn payload tấn công.

Cách chụp:

Terminal:

```bash
BASE="http://<NODE1_IP>"
curl -i "$BASE/api/v1/catalog/public/products?x=%27%20OR%201%3D1--"
```

Nếu dùng tunnel:

```bash
BASE="https://<PUBLIC_URL>"
curl -i -H "ngrok-skip-browser-warning: true" "$BASE/api/v1/catalog/public/products?x=%27%20OR%201%3D1--"
```

Chụp response có:

1. HTTP `403`
2. body `blocked_by_waf`
3. category `sqli`

Caption gợi ý:

`Hình X: Envoy Lua WAF chặn request có mẫu SQL injection trước khi đi vào service.`

#### Ảnh G02 - WAF chặn XSS

Vị trí chèn:

Cùng G01 hoặc phụ lục.

Cách chụp:

```bash
curl -i "$BASE/api/v1/catalog/public/products?x=%3Cscript%3Ealert(1)%3C/script%3E"
```

Tiêu chí ảnh đạt:

1. HTTP `403`.
2. `category` là `xss`.

Caption gợi ý:

`Hình X: Envoy Lua WAF chặn request có mẫu XSS.`

#### Ảnh G03 - Rate limit trả HTTP 429

Vị trí chèn:

Phần gateway hardening hoặc API abuse experiment.

Mục đích:

Chứng minh rate limit chạy thật.

Cách chụp:

```bash
BASE="http://<NODE1_IP>"
for i in $(seq 1 130); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/catalog/public/products?page=1&size=1")
  echo "$i $code"
done | tail -40
```

Chụp phần cuối thấy `429`.

Lưu ý:

1. Envoy config đặt bucket `100/60s`.
2. Nếu chạy qua tunnel, tunnel có thể thêm giới hạn riêng. Ưu tiên dùng NODE-1 IP nội bộ để chứng minh Envoy.

Caption gợi ý:

`Hình X: Gateway trả HTTP 429 khi số request vượt ngưỡng rate limit cấu hình.`

#### Ảnh G04 - Stripe webhook thiếu signature bị từ chối

Vị trí chèn:

Phần payment security.

Mục đích:

Chứng minh webhook không chấp nhận request giả thiếu chữ ký Stripe.

Cách chụp:

Gọi trực tiếp payment-service từ môi trường được phép truy cập NODE-3:

```bash
curl -i -X POST "http://<NODE3_IP>:8004/api/v1/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -d '{"id":"evt_demo_missing_signature","type":"checkout.session.completed","data":{"object":{}}}'
```

Kỳ vọng:

```text
HTTP/1.1 400
Missing Stripe-Signature header
```

Tiêu chí ảnh đạt:

1. Endpoint là `/api/v1/webhooks/stripe`.
2. HTTP `400`.
3. Lỗi nhắc thiếu `Stripe-Signature`.

Caption gợi ý:

`Hình X: Payment Service từ chối webhook Stripe không có header chữ ký.`

#### Ảnh G05 - Cụm ảnh cho mục 3.3.3 HMAC-SHA256 Service-to-Service

Vị trí chèn:

Ngay sau mục `3.3.3. HMAC-SHA256 Service-to-Service` trong báo cáo.

Mục đích:

Chứng minh request service-to-service không được gọi tự do. Request nội bộ phải có chữ ký HMAC, timestamp và nonce; thiếu/sai/gửi lại đều bị chặn.

Nên chụp thành một cụm 4-5 ảnh nhỏ, đặt liên tiếp trong báo cáo:

1. G05.1 - Thiếu HMAC bị chặn.
2. G05.2 - Vault Transit tạo HMAC bằng `sha2-256`.
3. G05.3 - Request có HMAC đúng đi qua tầng HMAC.
4. G05.4 - Sửa body nhưng giữ chữ ký cũ bị chặn.
5. G05.5 - Gửi lại cùng nonce bị chặn replay.

Lưu ý quan trọng:

1. Không chụp source code.
2. Không chụp lộ `X-Internal-Token`, Vault token, AppRole secret id.
3. Được giữ lại `X-Signature`, `X-Timestamp`, `X-Nonce`, `X-Key-Version`, HTTP status và mã lỗi.
4. Nếu gọi `http://<NODE3_IP>:8004` bị `Empty reply from server`, khả năng cao payment-service đang chạy HTTPS/mTLS. Khi đó dùng cấu hình HTTPS/mTLS ở bước chuẩn bị bên dưới.

##### Chuẩn bị trước khi chụp G05

Chạy trên máy có quyền truy cập payment-service và Vault. Nếu payment-service nằm ở NODE-3 thì chạy trực tiếp trên NODE-3 là dễ chụp nhất.

Tạo mã demo:

```bash
RUN_ID="NT219-$(date +%Y%m%d-%H%M)"
ORDER_ID="hmac-$RUN_ID"
echo "$RUN_ID"
```

Chọn một trong hai kiểu kết nối.

Nếu payment-service đang mở HTTP thường:

```bash
PAYMENT_URL="http://<NODE3_IP>:8004"
CURL_TLS_ARGS=()
```

Nếu payment-service đang chạy HTTPS/mTLS:

```bash
PAYMENT_URL="https://payment-service:8004"
CURL_TLS_ARGS=(
  --resolve payment-service:8004:<NODE3_IP>
  --cacert /opt/uitstore/certs/ca.crt
  --cert /opt/uitstore/certs/order.crt
  --key /opt/uitstore/certs/order.key
)
```

Kiểm tra đúng protocol trước:

```bash
curl -sS -i "${CURL_TLS_ARGS[@]}" "$PAYMENT_URL/health"
```

Kỳ vọng:

```text
HTTP/1.1 200
```

Nếu vẫn `Empty reply from server`, chưa chụp HMAC vội. Đây là lỗi kết nối sai protocol/cert, không phải bằng chứng HMAC.

Tạo body cố định cho các lần test:

```bash
BODY='{"order_id":"'"$ORDER_ID"'","amount":"100000","currency":"VND","payment_method_type":"cod"}'
PATH_ONLY="/api/v1/payments/charge"
```

Nếu muốn chụp request hợp lệ đi sâu hơn tầng HMAC, đặt token nội bộ bằng biến môi trường. Không hiển thị giá trị token trên màn hình:

```bash
read -s INTERNAL_TOKEN
```

Khi terminal chờ nhập, paste token rồi nhấn Enter. Lúc chụp, chỉ để hiện `$INTERNAL_TOKEN`, không để hiện giá trị thật.

##### G05.1 - Thiếu HMAC bị chặn

Cách chụp:

```bash
printf 'Demo: missing HMAC headers\n'
curl -sS -i "${CURL_TLS_ARGS[@]}" -X POST "$PAYMENT_URL$PATH_ONLY" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

Kỳ vọng:

```text
HTTP/1.1 401
MISSING_SIGNATURE_HEADERS
```

Hoặc có thể thấy lỗi thiếu replay headers/internal token tùy middleware chạy trước. Điểm quan trọng là request bị từ chối trước khi xử lý nghiệp vụ.

Tiêu chí ảnh đạt:

1. Thấy endpoint `/api/v1/payments/charge`.
2. Thấy HTTP `401`.
3. Thấy lỗi liên quan thiếu `X-Signature`, `X-Timestamp`, `X-Nonce` hoặc internal token.

Caption gợi ý:

`Hình X: Payment Service từ chối request nội bộ không có chữ ký HMAC, timestamp và nonce.`

##### G05.2 - Vault Transit tạo HMAC bằng SHA-256

Mục đích:

Chứng minh chữ ký HMAC được tạo qua Vault Transit với thuật toán `sha2-256`.

Chuẩn bị Vault CLI:

```bash
export VAULT_ADDR="http://127.0.0.1:8200"
export HMAC_KEY="order-hmac-key"
```

Kiểm tra Vault và key HMAC có thật:

```bash
vault status
vault read "transit/keys/$HMAC_KEY"
```

Kỳ vọng:

1. Vault ở trạng thái unsealed.
2. Key `$HMAC_KEY` tồn tại.
3. Nếu command báo không có key hoặc service đang chạy `VAULT_ENABLED=false`, không nên ghi claim "HMAC qua Vault Transit". Khi đó chỉ chụp được HMAC local/dev, hoặc phải bật lại Vault đúng cấu hình rồi mới chụp.

Không chụp `VAULT_TOKEN`. Nếu cần set token thì set trước rồi clear màn hình:

```bash
read -s VAULT_TOKEN
export VAULT_TOKEN
clear
```

Tạo canonical request. Canonical request là chuỗi chuẩn để ký; nó gồm method, path, timestamp, nonce và hash của body. Làm vậy để chỉ cần sửa body hoặc path là chữ ký không còn khớp.

```bash
TS=$(date +%s)
NONCE=$(uuidgen)
BODY_HASH=$(printf '%s' "$BODY" | openssl dgst -sha256 -r | awk '{print $1}')
CANONICAL=$(printf "POST\n%s\n%s\n%s\n%s" "$PATH_ONLY" "$TS" "$NONCE" "$BODY_HASH")
INPUT=$(printf '%s' "$CANONICAL" | base64 -w0)

vault write -format=json "transit/hmac/$HMAC_KEY" \
  input="$INPUT" \
  algorithm="sha2-256" > /tmp/nt219-hmac.json

SIG=$(jq -r '.data.hmac' /tmp/nt219-hmac.json)
KEY_VERSION=$(jq -r '.data.key_version' /tmp/nt219-hmac.json)

printf 'Vault Transit HMAC generated\n'
printf 'algorithm: sha2-256\n'
printf 'X-Signature: %s\n' "$SIG"
printf 'X-Timestamp: %s\n' "$TS"
printf 'X-Nonce: %s\n' "$NONCE"
printf 'X-Key-Version: %s\n' "$KEY_VERSION"
```

Kỳ vọng:

```text
algorithm: sha2-256
X-Signature: vault:v1:...
X-Timestamp: ...
X-Nonce: ...
X-Key-Version: 1
```

Tiêu chí ảnh đạt:

1. Thấy lệnh Vault gọi `transit/hmac/order-hmac-key`.
2. Thấy `algorithm: sha2-256`.
3. Thấy chữ ký dạng `vault:v...`.
4. Không lộ `VAULT_TOKEN`.

Caption gợi ý:

`Hình X: Vault Transit tạo chữ ký HMAC bằng SHA-256 cho canonical request nội bộ.`

Nếu máy không có `jq`, có thể chụp trực tiếp output JSON của Vault nhưng phải đảm bảo không có token/secret. Hoặc cài `jq` để ảnh gọn hơn.

##### G05.3 - Request có HMAC đúng đi qua tầng HMAC

Mục đích:

Chứng minh request đã ký đúng không bị middleware HMAC chặn. Nếu bạn có `INTERNAL_TOKEN`, request có thể đi sâu tới nghiệp vụ. Nếu chưa muốn lộ token, có thể cố tình không gửi token; khi response đổi sang lỗi `Invalid internal token` hoặc `Missing X-User-Id`, điều đó cho thấy tầng HMAC đã chấp nhận request và request đã đi tới lớp kiểm tra tiếp theo.

Cách chụp an toàn, không lộ token:

```bash
printf 'Demo: valid HMAC headers, internal token redacted\n'
printf 'X-Signature: %s\n' "$SIG"
printf 'X-Timestamp: %s\n' "$TS"
printf 'X-Nonce: %s\n' "$NONCE"
printf 'X-Key-Version: %s\n' "$KEY_VERSION"
printf 'X-Internal-Token: [REDACTED]\n'

curl -sS -i "${CURL_TLS_ARGS[@]}" -X POST "$PAYMENT_URL$PATH_ONLY" \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  -H "X-Timestamp: $TS" \
  -H "X-Nonce: $NONCE" \
  -H "X-Key-Version: $KEY_VERSION" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "X-User-Id: demo-user-$RUN_ID" \
  -H "Idempotency-Key: idem-$RUN_ID" \
  -d "$BODY"
```

Kỳ vọng tốt nhất:

```text
HTTP/1.1 200
```

Kỳ vọng vẫn chấp nhận được nếu dữ liệu demo chưa khớp nghiệp vụ:

```text
HTTP/1.1 4xx
```

nhưng body không được là:

```text
MISSING_SIGNATURE_HEADERS
INVALID_SIGNATURE
STALE_TIMESTAMP
REPLAY_ATTACK
```

Tiêu chí ảnh đạt:

1. Thấy đủ `X-Signature`, `X-Timestamp`, `X-Nonce`, `X-Key-Version`.
2. Không lộ `X-Internal-Token`.
3. Response không còn là lỗi HMAC. Nếu response là lỗi nghiệp vụ khác thì caption phải nói đúng: request đã qua tầng HMAC và bị chặn ở lớp tiếp theo.

Caption gợi ý nếu HTTP 200:

`Hình X: Request nội bộ có HMAC hợp lệ được Payment Service chấp nhận xử lý.`

Caption gợi ý nếu lỗi chuyển sang lớp khác:

`Hình X: Request có HMAC hợp lệ đi qua middleware HMAC và chuyển sang lớp kiểm tra nội bộ tiếp theo.`

##### G05.4 - Sửa body nhưng giữ chữ ký cũ bị chặn

Mục đích:

Chứng minh HMAC bảo vệ tính toàn vẹn. Nghĩa là nội dung request bị đổi thì chữ ký cũ không còn hợp lệ.

Cách chụp:

```bash
TAMPERED_BODY='{"order_id":"'"$ORDER_ID"'","amount":"999999","currency":"VND","payment_method_type":"cod"}'

printf 'Demo: tampered body with old signature\n'
printf 'Old X-Signature: %s\n' "$SIG"
printf 'Old X-Timestamp: %s\n' "$TS"
printf 'Old X-Nonce: %s\n' "$NONCE"
printf 'Original amount: 100000\n'
printf 'Tampered amount: 999999\n'

curl -sS -i "${CURL_TLS_ARGS[@]}" -X POST "$PAYMENT_URL$PATH_ONLY" \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  -H "X-Timestamp: $TS" \
  -H "X-Nonce: tampered-$NONCE" \
  -H "X-Key-Version: $KEY_VERSION" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "X-User-Id: demo-user-$RUN_ID" \
  -H "Idempotency-Key: idem-tampered-$RUN_ID" \
  -d "$TAMPERED_BODY"
```

Kỳ vọng:

```text
HTTP/1.1 401
INVALID_SIGNATURE
```

Vì sao đổi `X-Nonce` thành `tampered-$NONCE`:

Nếu dùng lại đúng nonce cũ, request có thể bị chặn bởi replay trước khi tới bước verify chữ ký. Ở ảnh này cần chứng minh sai chữ ký, nên dùng nonce khác để tránh nhầm với lỗi replay.

Caption gợi ý:

`Hình X: Khi body bị thay đổi nhưng vẫn dùng chữ ký HMAC cũ, Payment Service phát hiện chữ ký không hợp lệ và từ chối request.`

##### G05.5 - Gửi lại cùng nonce bị chặn replay

Mục đích:

Chứng minh nonce dùng một lần. Nonce là mã ngẫu nhiên gửi kèm request; nếu cùng nonce xuất hiện lần thứ hai thì hệ thống xem là request gửi lại.

Cách chụp:

Tạo một chữ ký mới để tránh dùng lại nonce ở G05.3:

```bash
TS2=$(date +%s)
NONCE2=$(uuidgen)
BODY_HASH2=$(printf '%s' "$BODY" | openssl dgst -sha256 -r | awk '{print $1}')
CANONICAL2=$(printf "POST\n%s\n%s\n%s\n%s" "$PATH_ONLY" "$TS2" "$NONCE2" "$BODY_HASH2")
INPUT2=$(printf '%s' "$CANONICAL2" | base64 -w0)

vault write -format=json "transit/hmac/$HMAC_KEY" \
  input="$INPUT2" \
  algorithm="sha2-256" > /tmp/nt219-hmac-replay.json

SIG2=$(jq -r '.data.hmac' /tmp/nt219-hmac-replay.json)
KEY_VERSION2=$(jq -r '.data.key_version' /tmp/nt219-hmac-replay.json)
```

Gửi lần 1:

```bash
printf 'Replay demo - first request\n'
curl -sS -i "${CURL_TLS_ARGS[@]}" -X POST "$PAYMENT_URL$PATH_ONLY" \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG2" \
  -H "X-Timestamp: $TS2" \
  -H "X-Nonce: $NONCE2" \
  -H "X-Key-Version: $KEY_VERSION2" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "X-User-Id: demo-user-$RUN_ID" \
  -H "Idempotency-Key: idem-replay-$RUN_ID" \
  -d "$BODY"
```

Gửi lần 2, giữ nguyên `X-Nonce`, `X-Timestamp`, `X-Signature` và body:

```bash
printf 'Replay demo - second request with same nonce\n'
curl -sS -i "${CURL_TLS_ARGS[@]}" -X POST "$PAYMENT_URL$PATH_ONLY" \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG2" \
  -H "X-Timestamp: $TS2" \
  -H "X-Nonce: $NONCE2" \
  -H "X-Key-Version: $KEY_VERSION2" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "X-User-Id: demo-user-$RUN_ID" \
  -H "Idempotency-Key: idem-replay-$RUN_ID" \
  -d "$BODY"
```

Kỳ vọng lần 2:

```text
HTTP/1.1 401
REPLAY_ATTACK
Nonce already used
```

Tiêu chí ảnh đạt:

1. Hai request dùng cùng `X-Nonce`.
2. Lần 2 có `REPLAY_ATTACK` hoặc thông báo nonce đã dùng.
3. Timestamp vẫn trong thời gian hợp lệ, để người đọc hiểu request bị chặn vì nonce, không phải vì timestamp cũ.

Caption gợi ý:

`Hình X: Request service-to-service dùng lại cùng nonce bị chặn nhằm ngăn replay attack.`

#### Ảnh G06 - Timestamp cũ bị chặn

Vị trí chèn:

Phần chống replay.

Mục đích:

Chứng minh timestamp window đang hoạt động.

Cách chụp:

```bash
OLD_TS=$(( $(date +%s) - 999999 ))
OLD_NONCE="demo-old-nonce-$OLD_TS"
OLD_BODY_HASH=$(printf '%s' "$BODY" | openssl dgst -sha256 -r | awk '{print $1}')
OLD_CANONICAL=$(printf "POST\n%s\n%s\n%s\n%s" "$PATH_ONLY" "$OLD_TS" "$OLD_NONCE" "$OLD_BODY_HASH")
OLD_INPUT=$(printf '%s' "$OLD_CANONICAL" | base64 -w0)

vault write -format=json "transit/hmac/$HMAC_KEY" \
  input="$OLD_INPUT" \
  algorithm="sha2-256" > /tmp/nt219-hmac-old.json

OLD_SIG=$(jq -r '.data.hmac' /tmp/nt219-hmac-old.json)
OLD_KEY_VERSION=$(jq -r '.data.key_version' /tmp/nt219-hmac-old.json)

curl -sS -i "${CURL_TLS_ARGS[@]}" -X POST "$PAYMENT_URL$PATH_ONLY" \
  -H "Content-Type: application/json" \
  -H "X-Timestamp: $OLD_TS" \
  -H "X-Nonce: $OLD_NONCE" \
  -H "X-Signature: $OLD_SIG" \
  -H "X-Key-Version: $OLD_KEY_VERSION" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -H "X-User-Id: demo-user-$RUN_ID" \
  -H "Idempotency-Key: idem-old-ts-$RUN_ID" \
  -d "$BODY"
```

Kỳ vọng:

```text
STALE_TIMESTAMP
```

hoặc:

```text
REPLAY_ATTACK
```

Nếu HMAC middleware chạy trước và báo thiếu signature, dùng ảnh G05 là đủ; không ép ảnh này.

Caption gợi ý:

`Hình X: Middleware chống replay từ chối request có timestamp nằm ngoài cửa sổ chấp nhận.`

#### Ảnh G07 - Audit append-only với payment audit log

Vị trí chèn:

Phần audit integrity.

Mục đích:

Chứng minh audit log không cho sửa/xóa trực tiếp ở PostgreSQL nếu migration append-only đã chạy.

Cách chụp:

Chỉ làm trên dữ liệu demo. Trong `payment_db`, lấy một audit row mới nhất:

```sql
SELECT id, created_at, table_name, record_id, action
FROM payment_audit_log
ORDER BY created_at DESC
LIMIT 1;
```

Sau đó thử update một trường không quan trọng:

```sql
UPDATE payment_audit_log
SET action = 'HACK'
WHERE id = '<AUDIT_ID>';

SELECT id, action
FROM payment_audit_log
WHERE id = '<AUDIT_ID>';
```

Nếu PostgreSQL RULE đang hoạt động, action không đổi.

Tiêu chí ảnh đạt:

1. Trước và sau update, action vẫn không đổi.
2. Không làm trên dữ liệu thật.

Caption gợi ý:

`Hình X: PostgreSQL rule giữ audit log ở dạng append-only, thao tác UPDATE trực tiếp không làm thay đổi bản ghi audit.`

### 3.8. Nhóm H: Shipping, inventory, notification nếu đã chạy đầy đủ

Nhóm này là phụ. Chỉ chụp nếu hệ thống live thật sự sinh dữ liệu ở các service này.

#### Ảnh H01 - Inventory availability/reservation

Vị trí chèn:

Phần inventory hoặc saga.

Cách chụp:

1. Nếu checkout gọi inventory và có reservation, query `inventory_db`.
2. Chụp bảng reservation/stock liên quan product.
3. Nếu chưa có dữ liệu inventory runtime, bỏ ảnh này.

Caption gợi ý:

`Hình X: Inventory Service cập nhật trạng thái giữ hàng cho sản phẩm trong đơn.`

#### Ảnh H02 - Shipping tracking public endpoint

Vị trí chèn:

Phần shipping workflow.

Cách chụp:

Nếu có tracking number:

```text
http://<NODE1_IP>/api/v1/shipping/public/track/<TRACKING_NUMBER>
```

Chụp JSON hoặc UI nếu frontend có màn hình tracking.

Caption gợi ý:

`Hình X: Shipping Service trả thông tin tracking công khai theo tracking number.`

#### Ảnh H03 - Notification log

Vị trí chèn:

Phụ lục event-driven workflow.

Cách chụp:

Nếu notification-service đã nhận event và ghi log:

```sql
SELECT
  id,
  user_id,
  category,
  status,
  recipient_masked,
  length(recipient_email_encrypted) AS email_bytes,
  reference_type,
  reference_id,
  created_at
FROM notification_log
ORDER BY created_at DESC
LIMIT 10;
```

Caption gợi ý:

`Hình X: Notification Service ghi nhận thông báo phát sinh từ event nghiệp vụ và che/mã hóa dữ liệu người nhận.`

## 4. Cách Sắp Xếp Ảnh Trong Báo Cáo

### 4.1. Nếu muốn ít ảnh nhưng rất mạnh

Chèn 14 ảnh sau trong thân báo cáo:

1. A01 - Frontend nhận dữ liệu từ Catalog Service.
2. A03 - Prometheus Targets UP.
3. A05 - Envoy clusters.
4. B01 - Keycloak login.
5. B03 - Không token bị 401.
6. C03 - Checkout có `RUN_ID`.
7. C04 - Request checkout 200.
8. C05 - Đặt hàng thành công.
9. D01 - `orders` row khớp UI.
10. D03 - `order_addresses` ciphertext.
11. D05 - `saga_state`.
12. D06 - order audit HMAC.
13. E02 - Vault transit keys.
14. G01 hoặc G03 - WAF 403 hoặc rate limit 429.

Nếu có Stripe card flow, thêm:

1. F01 - Stripe Checkout.
2. F02 - Stripe dashboard.
3. D07 - payment transaction khớp order.

### 4.2. Vị trí chèn theo chương/mục

Nếu báo cáo có chương Thiết kế hệ thống:

1. Sau kiến trúc tổng thể: A01, A03, A05.
2. Sau phần stack công nghệ: A06, A07, A09.
3. Sau phần API Gateway/WAF: A05, G01, G02, G03.
4. Sau phần OAuth/OIDC: B01, B02, B03.
5. Sau phần HMAC/nonce: G05, G06.
6. Sau phần Vault/KMS: E01, E02, E03.
7. Sau phần database encryption/FLE: D03, D04, E04.
8. Sau phần audit log: D06, D08, G07.
9. Sau phần checkout saga: C01-C08, D01-D05, D07.

Nếu báo cáo có chương Thực nghiệm:

1. Môi trường triển khai: A02-A09.
2. Thực nghiệm user flow: C01-C08.
3. Thực nghiệm security: B03, G01-G06.
4. Thực nghiệm bảo vệ dữ liệu: D03, D04, D09, F02, F03.
5. Phụ lục: toàn bộ ảnh terminal chi tiết và video link/QR.

### 4.3. Bố cục ảnh ghép nên dùng

Để giảm số trang nhưng vẫn trực quan, tạo ảnh ghép 2 cột:

1. UI order success bên trái, DB `orders` bên phải.
2. UI address plaintext bên trái, DB ciphertext bên phải.
3. Stripe dashboard bên trái, DB payment transaction bên phải.
4. Prometheus targets bên trái, terminal `/health` bên phải.
5. Keycloak login bên trái, API 401 không token bên phải.

Mỗi ảnh ghép phải có cùng `RUN_ID`, `order_number` hoặc `order_id`.

## 5. Quy Trình Chụp Một Buổi Demo Hoàn Chỉnh

### 5.1. Chuẩn bị

1. Mở 6 tab trình duyệt:
   - Frontend
   - Keycloak login
   - Prometheus Targets
   - Grafana Explore
   - Vault UI
   - Stripe test dashboard nếu dùng card
2. Mở DB client:
   - `order_db`
   - `payment_db`
   - `notification_db` nếu có
3. Mở terminal:
   - NODE-1
   - NODE-2
   - NODE-3
   - NODE-4
4. Tạo `RUN_ID`.
5. Đặt trình duyệt zoom 90-100%.
6. Tắt thông báo desktop để không lộ thông tin cá nhân.

### 5.2. Thứ tự chụp khuyến nghị

1. A03 Prometheus Targets UP trước khi thao tác.
2. A01 Frontend có Catalog Service.
3. B01 Keycloak login.
4. B02 request protected sau login.
5. C01 sản phẩm.
6. C02 giỏ hàng.
7. C03 checkout có `RUN_ID`.
8. C04 request checkout 200.
9. C05 order success.
10. C06 danh sách đơn hàng.
11. D01 orders row.
12. D02 order_items.
13. D03 order_addresses ciphertext.
14. D04 API/UI giải mã address.
15. D05 saga_state.
16. D06 order audit HMAC.
17. Nếu credit card: F01 Stripe Checkout.
18. Nếu credit card: F02 Stripe dashboard.
19. Nếu credit card: D07 payment transaction.
20. E02 Vault Transit keys.
21. G01 WAF SQLi 403.
22. G03 rate limit 429.
23. G04 Stripe webhook missing signature 400.
24. G05 payment internal missing HMAC/internal token 401.

### 5.3. Đặt tên file ảnh

Đặt tên theo thứ tự để khi kéo vào báo cáo không nhầm:

```text
01_A01_frontend_catalog_up.png
02_A03_prometheus_targets_up.png
03_B01_keycloak_login_pkce.png
04_C03_checkout_run_id.png
05_C04_checkout_api_200.png
06_C05_order_success.png
07_D01_order_db_row.png
08_D03_address_ciphertext.png
09_D05_saga_state.png
10_D06_order_audit_hmac.png
11_E02_vault_transit_keys.png
12_G01_waf_sqli_block.png
```

Nếu ảnh gắn với một `RUN_ID`, thêm mã vào cuối:

```text
06_C05_order_success_NT219-20260621-1405.png
```

## 6. Hướng Dẫn Quay Video Phụ Kèm

Video chỉ là phụ, nhưng nên quay để người chấm có thể kiểm chứng nếu nghi ngờ ảnh tĩnh.

### 6.1. Video 1 - End-to-end checkout

Thời lượng:

4-7 phút.

Mục tiêu:

Chứng minh người dùng thao tác thật từ frontend đến order database.

Kịch bản:

1. Mở frontend, nói rõ URL đang chạy.
2. Reload trang để thấy Catalog Service load sản phẩm.
3. Bấm đăng nhập, chuyển sang Keycloak.
4. Đăng nhập bằng tài khoản demo.
5. Chọn sản phẩm, thêm giỏ.
6. Mở giỏ hàng.
7. Vào checkout, nhập `RUN_ID`.
8. Bấm đặt hàng.
9. Dừng ở màn hình order success, zoom vào `order_number`.
10. Mở DB client, query `orders` với `order_number`.
11. Mở `order_addresses`, cho thấy ciphertext.
12. Mở `order_audit_log`, cho thấy HMAC signature.

Nếu dùng Stripe:

1. Chọn credit card.
2. Chuyển sang Stripe Checkout.
3. Thanh toán bằng thẻ test.
4. Mở Stripe test dashboard và DB `payment_transactions`.

Điểm cần tránh:

1. Không quay password.
2. Không quay token.
3. Không quay Vault root token.
4. Không quay quá lâu ở terminal.

Tên file gợi ý:

```text
video_01_end_to_end_checkout_<RUN_ID>.mp4
```

### 6.2. Video 2 - Security controls đang chặn request sai

Thời lượng:

3-5 phút.

Mục tiêu:

Chứng minh hệ thống không chỉ chạy được happy path, mà còn chặn request sai.

Kịch bản:

1. Terminal gọi `/api/v1/cart/user/carts` không token, nhận `401`.
2. Terminal gọi SQLi payload, nhận `403 blocked_by_waf`.
3. Terminal chạy loop 130 request, cuối loop có `429`.
4. Terminal gọi Stripe webhook không `Stripe-Signature`, nhận `400`.
5. Terminal gọi payment `/api/v1/payments/charge` không HMAC/internal token, nhận `401`.
6. Kết thúc bằng Prometheus/Grafana vẫn thấy service UP.

Tên file gợi ý:

```text
video_02_security_controls_<RUN_ID>.mp4
```

### 6.3. Video 3 - Infrastructure live tour

Thời lượng:

2-4 phút.

Mục tiêu:

Chứng minh nhiều node/service cùng chạy.

Kịch bản:

1. NODE-1: `systemctl is-active nginx keycloak envoy`.
2. NODE-2: `systemctl is-active catalog-service cart-service order-service inventory-service shipping-service noti-service`.
3. NODE-3: `systemctl is-active vault payment-service`.
4. NODE-4: Prometheus targets hoặc Docker/systemd status.
5. Kafka topics.
6. Vault transit keys.

Tên file gợi ý:

```text
video_03_live_infrastructure_<RUN_ID>.mp4
```

### 6.4. Video 4 - Payment/Stripe flow

Chỉ quay nếu Stripe test mode đã cấu hình thật.

Thời lượng:

3-5 phút.

Mục tiêu:

Chứng minh tokenization/PSP flow.

Kịch bản:

1. Checkout chọn thẻ.
2. App redirect sang Stripe Checkout.
3. Thanh toán bằng test card.
4. Stripe dashboard hiển thị Payment/Checkout Session.
5. DB `payment_transactions` có `psp_transaction_id` khớp.
6. DB không có số thẻ.

Tên file gợi ý:

```text
video_04_stripe_payment_<RUN_ID>.mp4
```

## 7. Gợi Ý Chèn Link Video Vào Báo Cáo

Trong phụ lục, tạo bảng:

| Video   | Nội dung                 | Minh chứng chính                  |
| ------- | ------------------------ | --------------------------------- |
| Video 1 | End-to-end checkout      | UI, Order DB, FLE, audit log      |
| Video 2 | Security controls        | 401, 403, 429, webhook 400        |
| Video 3 | Infrastructure live tour | service UP, Kafka, Vault          |
| Video 4 | Stripe payment           | Stripe test dashboard, payment DB |

Nếu nộp PDF, tạo QR/link đến thư mục video. Tên video phải chứa `RUN_ID` hoặc ngày quay.

## 8. Checklist Trước Khi Đưa Ảnh Vào Báo Cáo

Trước khi chèn ảnh, kiểm tra từng ảnh:

1. Ảnh có chứng minh runtime không?
2. Ảnh có URL/host/service/status không?
3. Ảnh có cùng `RUN_ID`, `order_number`, `order_id` hoặc timestamp với các ảnh khác không?
4. Ảnh có lộ token/secret/password không?
5. Caption có nói đúng cái ảnh chứng minh, không phóng đại không?
6. Nếu ảnh là terminal, output có phải request/response thật không?
7. Nếu ảnh là DB, row có phải sinh từ lần demo không?
8. Nếu ảnh là dashboard, có phải dashboard đang lấy dữ liệu live không?

## 9. Những Claim Không Nên Chụp Nếu Chưa Kiểm Chứng Lại

Không nên đưa ảnh chứng minh các claim sau nếu chưa chạy thử live đúng như ảnh:

1. "Price tampering bị chặn" nếu bạn chưa có ảnh/API chứng minh sửa giá từ client bị từ chối hoặc server lấy lại giá từ Catalog.
2. "Notification đã gửi email thật" nếu notification-service chưa kết nối SMTP thật hoặc chưa có log gửi thành công.
3. "mTLS toàn bộ service-to-service" nếu chỉ có một số path/client đang bật TLS/mTLS.
4. "Payment route không expose public" nếu gateway hiện có route hoặc tunnel khác mở tới payment.
5. "Audit append-only toàn hệ thống" nếu mới có payment audit log có rule append-only.
6. "Vault bắt buộc ở production" nếu environment hiện tại đang chạy `VAULT_ENABLED=false` và fallback local dev crypto.

Nếu muốn chứng minh các claim này, phải chụp ảnh runtime cụ thể kèm request/response hoặc DB state tương ứng.

## 10. Câu Caption Mẫu Cho Báo Cáo

Bạn có thể dùng các caption sau:

1. `Hình X: Frontend nhận dữ liệu sản phẩm từ Catalog Service qua API Gateway, thể hiện hệ thống đang chạy end-to-end thay vì dữ liệu tĩnh.`
2. `Hình X: Prometheus ghi nhận các microservice ở trạng thái UP trong môi trường triển khai.`
3. `Hình X: Keycloak xử lý đăng nhập qua OAuth2 Authorization Code + PKCE; mật khẩu không được nhập trực tiếp vào frontend.`
4. `Hình X: API protected từ chối request không có Bearer JWT với HTTP 401.`
5. `Hình X: Checkout tạo đơn hàng thành công và trả về order_number từ Order Service.`
6. `Hình X: Bản ghi orders trong PostgreSQL khớp order_number hiển thị trên frontend.`
7. `Hình X: Các trường PII của địa chỉ giao hàng được lưu ở dạng ciphertext trong order_addresses.`
8. `Hình X: Vault Transit quản lý các khóa phục vụ FLE, HMAC và ký audit/event.`
9. `Hình X: Stripe Checkout xử lý dữ liệu thẻ ở phía PSP; hệ thống nội bộ chỉ lưu tham chiếu PSP.`
10. `Hình X: WAF tại API Gateway chặn payload SQL injection trước khi request vào microservice.`
11. `Hình X: Gateway trả HTTP 429 khi vượt ngưỡng rate limit, chứng minh cơ chế chống abuse đang hoạt động.`
12. `Hình X: Payment Service từ chối webhook Stripe thiếu chữ ký, ngăn request giả mạo từ bên ngoài.`
