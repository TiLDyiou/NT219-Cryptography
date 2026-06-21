# KỊCH BẢN THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN NT219 (BẢN TRỰC DIỆN)

**NT219.Q22.ANTT_2026 · UIT Store**

> LƯU Ý: Văn phong kịch bản này đi thẳng vào vấn đề kỹ thuật, phân tích trực diện CƠ CHẾ và TẠI SAO. Bỏ qua các từ ngữ rườm rà. Lời nói là phần in thường, thao tác là chữ in nghiêng.

---

## SLIDE 1 — TRANG BÌA (30s)

"Em chào thầy/cô và tất cả các bạn.

chúng em xin được trình bày đồ án môn NT219 — Mật mã học ứng dụng. Đề tài của nhóm là **Thiết kế và Đánh giá An toàn Mật mã cho một Nền tảng Thương mại Điện tử**.

Điểm đặc biệt của đồ án này là: thay vì chỉ trình bày lý thuyết các thuật toán mật mã, nhóm em đã **xây dựng hẳn một sàn thương mại điện tử chạy thật**, rồi áp dụng và **đo lường** xem các cơ chế mật mã hoạt động hiệu quả tới đâu trên hệ thống thật đó.

Sau đây em xin đi vào phần giới thiệu đề tài."

_(Chuyển slide)_

---

## SLIDE 2 — BỐI CẢNH VÀ LÝ DO CHỌN ĐỀ TÀI (1 phút)

"Đầu tiên, vì sao nhóm em chọn thương mại điện tử làm bối cảnh?

Bởi vì thương mại điện tử là một trong số ít hệ thống chứa **đồng thời cả bốn loại tài sản nhạy cảm nhất** đối với mật mã học. Thứ nhất là **thông tin thẻ thanh toán** của khách. Thứ hai là **token xác thực** — tức phiên đăng nhập của người dùng. Thứ ba là **dữ liệu cá nhân**, hay PII, như tên, địa chỉ, số điện thoại. Và thứ tư, thường bị bỏ quên, là **niềm tin giữa các service nội bộ** với nhau.

Đề tài cụ thể của nhóm là *Online Shopping Service Platform*, tham khảo mô hình của Amazon và Shopee.

*(Chỉ vào bảng)* Và đây là lý do đề tài này rất hợp với môn NT219: mỗi loại tài sản em vừa kể đều ánh xạ trực tiếp tới một cơ chế mật mã. Số thẻ khách hàng thì nhóm dùng **tokenization** — tức là không bao giờ lưu số thẻ thật. Phiên đăng nhập dùng **OAuth2, OpenID Connect, JWT ký bằng ES256 (ECDSA), kèm xác thực hai lớp MFA**. Các lời gọi API nội bộ giữa service với nhau dùng **HMAC-SHA256, với khóa được quản lý bởi Vault**. Dữ liệu cá nhân thì mã hóa bằng **AES-256-GCM** theo từng trường. Còn toàn bộ khóa và bí mật thì giao cho **HashiCorp Vault** quản lý.

Về quy mô: hệ thống gồm **7 microservices, chạy trên 4 máy ảo**, tích hợp hạ tầng thật là Stripe, Keycloak, Vault, Kafka và bộ ELK. Em xin nhấn mạnh: tất cả **chạy thật, không phải mô phỏng**.

Nhưng xây xong chưa phải là xong. Trước khi bàn tới giải pháp, nhóm em tự đặt câu hỏi: **một hệ thống như vậy đang đối mặt với những rủi ro bảo mật nào?** Bởi chỉ khi nhận diện rõ rủi ro, mục tiêu bảo vệ mới có cơ sở. Em xin sang phần nhận diện rủi ro."

_(Chuyển slide)_

---

## SLIDE 3 — SECURITY RISKS (1. Authentication Failures & 2. Broken Access Control) (1 phút 30s)

"Sau khi xây dựng hệ thống, nhóm em không cho rằng nó đã an toàn ngay. Chúng em **chủ động rà soát theo chuẩn OWASP** — bộ tiêu chuẩn liệt kê các lỗ hổng web nguy hiểm nhất — và thực sự phát hiện nhiều nhóm rủi ro thực tế. Em xin trình bày lần lượt năm nhóm trong ba slide. Đây là hai nhóm đầu.

**Nhóm 1 — Lỗi xác thực (Authentication Failures).** Đây là nhóm liên quan đến việc hệ thống nhận diện 'bạn là ai'. Có hai vấn đề.

Thứ nhất, **tin tưởng mù quáng vào Header mà không có Gateway kiểm soát**. Trong kiến trúc microservices, các service hay truyền danh tính người dùng qua một header, ví dụ `X-User-Id`. Nếu không có một cổng kiểm soát ở giữa, thì bất kỳ ai lọt được vào mạng nội bộ chỉ cần **tự đặt header `X-User-Id` thành ID của nạn nhân** là lập tức giả được danh tính người đó — đặt hàng, xem đơn, thao tác thay họ.

Thứ hai, **JWT chỉ được giải mã ra để đọc mà không kiểm tra chữ ký**. JWT gồm hai phần: nội dung và chữ ký. Nhiều lập trình viên chỉ 'decode' lấy nội dung mà quên bước 'verify' chữ ký. Hậu quả là **kẻ tấn công tự chế một token, ghi mình là admin**, hệ thống vẫn tin — vì nó có đọc chữ ký đâu mà biết là giả.

**Nhóm 2 — Sai sót kiểm soát truy cập (Broken Access Control).** Nhóm này liên quan đến 'bạn được phép làm gì'.

Một là **API quản trị không có lớp bảo vệ riêng**: các endpoint admin lẽ ra chỉ dành cho quản trị viên, nhưng lại không kiểm tra vai trò, nên một user thường vẫn gọi được — đây chính là lỗi leo thang đặc quyền.

Hai là **thao túng trạng thái đơn vận chuyển qua webhook giả**: đơn vị vận chuyển báo trạng thái về hệ thống qua webhook. Nếu webhook không kiểm tra chữ ký, kẻ tấn công **tự gửi một webhook giả báo 'đã giao hàng'**, hệ thống ghi nhận đơn hoàn tất mà thực tế hàng chưa hề rời kho — gây thất thoát.

Điểm chung của cả hai nhóm này là cho phép **vượt quyền và giả mạo danh tính**. Cách nhóm em vá lại — đặt API Gateway làm cổng kiểm soát duy nhất, bắt buộc verify chữ ký JWT, ký webhook, và phân quyền theo vai trò — em sẽ trình bày kỹ ở phần kiến trúc."

_(Chuyển slide)_

---

## SLIDE 4 — SECURITY RISKS (3. Insecure Design & 4. Injection) (1 phút 30s)

"Sang nhóm thứ ba và thứ tư.

**Nhóm 3 — Thiết kế thiếu an toàn (Insecure Design)** theo em là **nhóm nguy hiểm nhất**, vì nó không phải lỗi code vặt mà nằm ngay trong **logic nghiệp vụ** — không có công cụ quét tự động nào bắt được, phải hiểu hệ thống mới thấy. Có bốn lỗ hổng:

Một, **đua lệnh — race condition — dẫn đến tính tiền hai lần**. Khi người dùng bấm nút thanh toán hai lần thật nhanh, hoặc mạng chập chờn khiến request gửi lặp, hai tiến trình cùng chạy song song và hệ thống **charge tiền hai lần** cho một đơn. Đây là lỗi kinh điển trong thanh toán.

Hai, **ghi nhận sự kiện trước khi xử lý logic**. Hệ thống báo 'thành công' và phát sự kiện đi trước khi thật sự hoàn tất xử lý. Nếu bước sau lỗi, ta đã lỡ thông báo thành công rồi — dẫn đến **dữ liệu giữa các service lệch nhau**, ví dụ đã gửi email xác nhận nhưng đơn thực ra thất bại.

Ba, **tính giá tiền dựa trên dữ liệu từ client**. Nếu server tin vào con số giá mà trình duyệt gửi lên, kẻ tấn công chỉ cần **sửa giá ngay trên trình duyệt** — ví dụ từ 10 triệu xuống 1 đồng — rồi gửi đi. Đây chính là kịch bản em sẽ demo trực tiếp ở phần sau.

Bốn, **lỗi quy đổi tiền tệ làm hoàn tiền sai số lượng** — khi xử lý nhiều đơn vị tiền tệ, sai sót làm tròn hay đổi tỉ giá có thể khiến hệ thống **hoàn nhiều tiền hơn số khách đã trả**.

**Nhóm 4 — Injection.** Ở đây là **rò rỉ token qua lỗ hổng trên trình duyệt**, điển hình là tấn công **XSS** — kẻ tấn công chèn được mã JavaScript độc vào trang, đánh cắp token đăng nhập đang lưu ở trình duyệt nạn nhân, rồi dùng token đó **chiếm phiên** của họ.

Toàn bộ nhóm này được nhóm em xử lý bằng **idempotency key** — mỗi giao dịch có một khóa định danh để dù gọi lặp cũng chỉ trừ tiền một lần; **kiểm tra và tính giá hoàn toàn ở phía server**, tuyệt đối không tin client; và **Saga Pattern** để mỗi bước trong quy trình đều có thể rollback an toàn khi có lỗi."

_(Chuyển slide)_

---

## SLIDE 5 — SECURITY RISKS (5. Mishandling of Exceptional Conditions) (1 phút)

"Và nhóm cuối cùng — **Xử lý sai các tình huống ngoại lệ**. Nhóm này tinh vi ở chỗ nó không phải lỗi khi hệ thống chạy bình thường, mà là lỗi **khi có sự cố xảy ra**. Có hai điểm.

Một, **'âm thầm dự phòng' — Silent Fallback**. Hãy hình dung: một cơ chế bảo mật, ví dụ dịch vụ kiểm tra chữ ký, bất ngờ gặp lỗi hoặc quá tải. Thay vì báo lỗi và dừng lại, hệ thống được lập trình kiểu 'thôi cứ cho qua cho mượt'. Vô tình, **toàn bộ lớp bảo mật đó bị vô hiệu hóa mà không một ai hay biết** — kẻ tấn công chỉ cần làm cho cơ chế bảo mật lỗi là cửa mở toang.

Hai, **thông báo lỗi rò rỉ thông tin hệ thống**. Khi có exception, hệ thống trả nguyên một thông báo lỗi kỹ thuật ra ngoài cho người dùng — chứa **stack trace, đường dẫn file nội bộ, phiên bản thư viện, thậm chí cấu trúc database hay câu truy vấn SQL**. Với kẻ tấn công, mỗi thông báo lỗi như vậy là một mảnh bản đồ giúp chúng hiểu hệ thống và tìm đường khai thác sâu hơn.

Nguyên tắc khắc phục của nhóm em là **fail-closed** — tức là khi một cơ chế bảo mật gặp lỗi thì mặc định phải **từ chối, đóng cửa**, chứ tuyệt đối không cho đi tiếp; và **che giấu toàn bộ chi tiết lỗi kỹ thuật**, chỉ trả cho người dùng một thông báo chung chung, còn chi tiết thì ghi vào log nội bộ để nhóm vận hành xử lý.

Như vậy, năm nhóm rủi ro này cho thấy rõ hệ thống có thể bị tấn công ở đâu và ai sẽ chịu thiệt hại. Chính từ bức tranh rủi ro đó, nhóm em mới xác định được mục tiêu cụ thể của đồ án — em xin sang slide tiếp theo."

_(Chuyển slide)_

---

## SLIDE 6 — PROJECT GOAL (1 phút 30s)

"Sau khi đã thấy rõ hệ thống đối mặt với những rủi ro nào, mục tiêu của đồ án trở nên rất tự nhiên: **từ mỗi rủi ro vừa nhận diện, đặt ra một cơ chế mật mã tương ứng để bịt lại** — và chứng minh bằng thực nghiệm rằng lớp bảo vệ đó **không làm chậm trải nghiệm người dùng**.

Nhưng để dễ hình dung 'bảo vệ để làm gì', nhóm em quy các rủi ro đó về **ba bên cần được bảo vệ**, vì suy cho cùng mọi rủi ro đều làm tổn thương một trong ba bên này.

*(Chỉ vào nhóm 1)* **Thứ nhất — Khách hàng.** Từ các rủi ro giả mạo danh tính, đánh cắp token qua XSS, và lộ dữ liệu, khách hàng cần được bảo vệ khỏi **lộ số thẻ, lộ thông tin cá nhân, và bị chiếm tài khoản**. Mục tiêu cho nhóm này: số thẻ dùng **tokenization** — không bao giờ lưu thẻ thật; phiên đăng nhập bảo vệ bằng **JWT ký ES256 (ECDSA) cộng MFA**; dữ liệu cá nhân **mã hóa AES-256-GCM** từng trường, đến cả quản trị viên cơ sở dữ liệu cũng không đọc được.

*(Chỉ vào nhóm 2)* **Thứ hai — Người bán.** Từ các rủi ro webhook giả báo 'đã giao', đơn giả báo 'đã thanh toán', và sửa giá phía client, người bán cần được bảo vệ khỏi **xuất hàng mà không thu được tiền, và thất thoát doanh thu**. Mục tiêu: **ký và xác minh mọi webhook**, **tính giá hoàn toàn ở phía server**, và dùng **idempotency** để một đơn không bị xử lý nhầm hai lần.

*(Chỉ vào nhóm 3)* **Thứ ba — Nội bộ hệ thống, hay doanh nghiệp.** Từ các rủi ro tin tưởng mù quáng vào header, service nội bộ bị giả mạo, race condition charge hai lần, và vi phạm PCI-DSS, hệ thống cần được bảo vệ khỏi **service giả mạo, gian lận thanh toán, và rủi ro pháp lý**. Mục tiêu: mọi lời gọi nội bộ phải **ký HMAC kèm danh tính** — không cho nặc danh; sự kiện Kafka **ký ECDSA** chống bơm sự kiện giả; toàn bộ khóa giao cho **Vault** quản lý tập trung và ghi log; và cô lập mạng để **thu hẹp phạm vi PCI-DSS**.

Và xuyên suốt cả ba bên là **hai nguyên tắc**: **phòng thủ theo chiều sâu** — mỗi tài sản một lớp riêng, thủng lớp này còn lớp khác; và **hiệu năng đo được** — toàn bộ phần mật mã được benchmark để chứng minh chi phí nằm dưới ngưỡng người dùng cảm nhận. Nói ngắn gọn: **bảo mật mà không hy sinh tốc độ**.

Tiếp theo, em xin trình bày **kiến trúc giải pháp** đã hiện thực hóa các mục tiêu này."

_(Chuyển slide)_

---

## SLIDE 7 — KIẾN TRÚC GIẢI PHÁP (2 phút 30s)

"Đây là toàn cảnh kiến trúc. Em xin đi theo đúng đường đi của một request từ trái sang phải để hội đồng thấy mỗi chặng được bảo vệ ra sao. Nguyên tắc xuyên suốt là **Zero Trust** — không thành phần nào tin tưởng thành phần khác một cách mặc định — và **Defense in Depth** — mỗi chặng có một lớp mật mã riêng, thủng một lớp cũng chưa sập hệ thống.

1. **Client → Nginx proxy (ingress):** người dùng kết nối vào bằng **HTTPS**. Nginx là điểm chạm đầu tiên ở vùng ingress, làm nhiệm vụ **TLS termination** — giải mã HTTPS tại biên trước khi đẩy vào trong.

2. **Nginx → Envoy (API Gateway):** Envoy là **cổng định tuyến trung tâm**. Mọi request đều phải qua đây — đây là chỗ áp **rate limiting** chống brute-force và kiểm tra token trước khi cho vào hệ thống.

3. **Envoy → Keycloak — Authenticate:** nếu request chưa có token, Envoy đẩy người dùng qua **Keycloak** để đăng nhập. Keycloak cấp **JWT ký bằng ES256 — tức ECDSA trên đường cong elliptic** — Keycloak giữ Private Key để ký, các service chỉ cần Public Key để tự xác minh độc lập, không cần hỏi lại Keycloak.

4. **Envoy → Core Services — JWT:** sau khi có token, Envoy gắn **JWT** vào mỗi request rồi định tuyến tới khối **Core Services** gồm các microservice nghiệp vụ: **Catalog, Cart, Order**. Mỗi service **tự verify chữ ký JWT** — không service nào tin tưởng mặc định service khác, đúng tinh thần Zero Trust.

5. **Order → Payment (vùng PCI-DSS):** khi đặt hàng, Order gọi sang **Payment** — nằm trong **vùng cô lập PCI-DSS** cùng với Vault. Đây là vùng nhạy cảm nhất vì dính tới tiền và khóa, nên được khoanh riêng để thu hẹp phạm vi kiểm định PCI. Em xin lưu ý: lời gọi nội bộ này **không hề nặc danh** — ngoài JWT mang danh tính người dùng, bản thân service gọi còn phải kèm **chữ ký HMAC + timestamp**, nên một service giả mạo lọt vào mạng nội bộ cũng không thể tự ý gọi Payment.

6. **Payment → Vault — secret key:** Payment **không hardcode khóa**. Nó xin **secret key** từ **Vault** ngay lúc cần. Vault là 'két sắt' tập trung, ghi log mọi lần truy cập.

7. **Payment → Stripe API:** Payment dùng key vừa lấy để gọi **Stripe API** xử lý thanh toán. Số thẻ thật **không bao giờ chạm vào hệ thống** — Stripe trả về token, ta chỉ lưu token (Tokenization).

8. **Vault Transit — mã hóa dữ liệu:** với dữ liệu cá nhân (PII), Order gửi qua **Vault Transit** để mã hóa **AES-256-GCM** trước khi lưu — khóa không bao giờ rời khỏi Vault.

9. **Core Services → Database (TLS):** mọi kết nối tới **Database** đều đi qua **TLS** — dữ liệu trên đường truyền luôn được mã hóa, không ai nghe lén được. Quan trọng hơn, dữ liệu nhạy cảm khi nằm trong DB cũng **không phải plaintext**: các cột PII đã được mã hóa AES-256-GCM ở bước trước, nên ngay cả khi ai đó đọc thẳng được database thì cũng chỉ thấy **ciphertext vô nghĩa** — tức bảo vệ cả lúc truyền (in-transit) lẫn lúc lưu (at-rest).

**Tóm lại:** mỗi chặng có một lớp mật mã riêng — TLS ở biên và tới DB, JWT ES256 cho danh tính, HMAC + timestamp cho gọi nội bộ, Vault cho khóa, AES-GCM cho dữ liệu cả khi truyền lẫn khi lưu, và vùng PCI-DSS cô lập phần thanh toán. Đó chính là **phòng thủ theo chiều sâu**: không có một điểm nào mà thủng là sập toàn bộ."

_(Chuyển slide)_

---

## SLIDE 8 — PHƯƠNG ÁN TRIỂN KHAI (1 phút 30s)

"Về mặt hiện thực, toàn bộ hệ thống được triển khai trên **2 máy host vật lý**, tách theo mức độ nhạy cảm của dữ liệu chứ không gom chung một chỗ.

**Máy Host A — chứa 3 máy ảo (VM)** đảm nhận toàn bộ phần xử lý:
- **VM1 — vùng vào (ingress):** **Nginx proxy + Envoy API Gateway + Keycloak**. Đây là vùng duy nhất tiếp xúc bên ngoài: Nginx nhận HTTPS, Envoy định tuyến và kiểm token, Keycloak cấp JWT (ES256).
- **VM2 — dịch vụ nghiệp vụ:** **Catalog, Cart, Order**. Envoy gắn **Bearer JWT** rồi mới chuyển request vào đây.
- **VM3 — vùng PCI-DSS:** cô lập riêng **Payment + Vault**. Đây là điểm mấu chốt — tách phần thanh toán và khóa ra một VM riêng giúp **thu hẹp phạm vi đánh giá PCI-DSS**, càng gọn thì số máy phải kiểm định khắt khe càng ít, giảm cả rủi ro lẫn chi phí.

**Máy Host B — vùng dữ liệu:** chứa **Database và Kafka**, tách hẳn khỏi phần xử lý.

Hai host nối với nhau qua **Tailscale — đường hầm VPN WireGuard + TLS mã hóa end-to-end** — nên dù traffic đi giữa hai máy (ví dụ Payment ghi xuống Database, hay bắn sự kiện sang Kafka) cũng **không hề lộ ra Internet**. Riêng **Payment gọi thẳng Stripe API** ra ngoài để xử lý thẻ. Sự kiện trao đổi qua **Kafka** còn được **ký số ECDSA và verify khi consume**, chống bơm sự kiện giả vào hàng đợi.

Và về quản lý bí mật: **mã nguồn tuyệt đối không hardcode khóa**. Mỗi service lúc khởi động tự lấy key từ **Vault qua AppRole**; nhóm em còn quét **gitleaks** để đảm bảo **0 key thật trong toàn bộ lịch sử git**.

Một điểm thiết kế quan trọng về luồng nghiệp vụ — **Saga Pattern**: đặt hàng → giữ kho → kiểm tra gian lận → charge Stripe 3DS → xác nhận đơn → trừ kho → giao hàng → gửi email. Bất kỳ bước nào lỗi thì hệ thống **tự động rollback và hoàn hàng**, tránh tình trạng đơn treo hay trừ tiền mà không giao."

_(Chuyển slide)_

---

## SLIDE 9 — KẾT QUẢ TRIỂN KHAI (1 phút 30s)

"Chúng em không dừng ở lý thuyết mà **chạy 26 bài test trực tiếp trên hệ thống đang chạy thật**, chia thành 5 nhóm, kết quả **23/26 đạt**.

**Nhóm 1 — Đăng nhập & JWT, 4/5:** test token ký kiểu `alg:none` thì hệ thống từ chối; token giả mạo trả về 401; token hết hạn cũng 401; sai `audience` bị chặn.

**Nhóm 2 — Thanh toán, 6/7:** gửi webhook giả không đúng chữ ký HMAC thì trả về 400; đặc biệt là test **trả tiền hai lần** — lần đầu mất 438 mili-giây, lần thứ hai nhờ idempotency chỉ còn 5 mili-giây và bị chặn, không charge trùng.

**Nhóm 3 — Tấn công API, đạt tuyệt đối 7/7:** thử **SQL injection** thì WAF trả về 403; bắn **quá 100 request mỗi phút** thì rate limit trả về 429; cùng các test chống giả mạo lời gọi nội bộ.

**Nhóm 4 — Quản lý key, 4/4:** test **seal/unseal Vault**, test **xoay vòng khóa (key rotation)**, và đo độ trễ lấy key từ KMS là 24,6 mili-giây.

**Nhóm 5 — Chuỗi cung ứng, 2/3:** quét thấy **CVE giảm từ 40 xuống 8**; **không còn key thật nào trong lịch sử git**; riêng phần ký artifact vẫn còn trong backlog.

**Về mức cải thiện tổng thể:** lỗ hổng nghiêm trọng (HIGH/CRITICAL) đưa về 0; điểm **OWASP API Top 10 từ 2 lên đủ 10/10**; tuân thủ **PCI-DSS từ 2 lên 8 trên 9**.

Và câu hỏi lớn nhất — **lớp mật mã này có làm chậm hệ thống không?** Câu trả lời là **không**. Tổng overhead **dưới 6%**: mã hóa AES hay ký HMAC chỉ tốn chưa tới **0,002 mili-giây**, Vault nhờ cache 5 phút nên gần như bằng 0. Chỗ người dùng thật sự phải chờ chỉ là Stripe xử lý thanh toán **200–500 mili-giây** — đó là yếu tố bên ngoài, không phải do mật mã.

Tóm lại: **mọi tài sản nhạy cảm đều được bảo vệ và kiểm chứng bằng thực nghiệm — mà người dùng không hề cảm nhận được độ trễ.**"

_(Chuyển slide)_

---

## PHẦN DEMO (câu mở đầu)

"Sau phần kiến trúc và kết quả, nhóm em xin **demo trực tiếp 4 kịch bản** để chứng minh hệ thống chống đỡ tấn công thật. Mỗi kịch bản em sẽ mở video quay lại quá trình chạy thật trên hệ thống."

---

## SLIDE 10 — DEMO: LUỒNG THANH TOÁN TÍCH HỢP STRIPE (45s)

"Đầu tiên là **luồng happy path** — một giao dịch mua hàng hoàn chỉnh, để hội đồng thấy hệ thống chạy thật trước khi em tấn công nó.

Em đăng nhập vào UIT Store, chọn 4 sản phẩm, tổng tiền gần 12,7 triệu. Lưu ý trên thanh địa chỉ là **HTTPS · TLS 1.3** — kết nối đã được mã hóa. Khi bấm 'Đặt hàng & Thanh toán', đơn được đẩy sang **Order Service**, rồi **Payment Service gọi sang Stripe** để xử lý thẻ. Toàn bộ số thẻ thật **do Stripe giữ — hệ thống của em không bao giờ chạm vào** (Tokenization). Thanh toán xong, người dùng nhận email xác nhận."

_(Mở video, để chạy tới bước Stripe trả về thành công)_

---

## SLIDE 11 — DEMO: CHỐNG SỬA GÓI TIN (Data Tampering) (45s)

"Kịch bản thứ hai: kẻ tấn công **sửa giá ngay trên đường truyền**. Sản phẩm Samsung Galaxy Tab giá **9.490.000 đồng**.

Em đóng vai attacker, can thiệp request và **sửa trường giá xuống còn 1 đồng** trước khi gửi lên server. Nhưng backend **không tin giá từ client** — nó tự đối chiếu lại giá gốc trong database, đồng thời gói tin nội bộ được **ký HMAC**, nên mọi chỉnh sửa đều phá vỡ chữ ký. Kết quả: hệ thống **phát hiện bất thường và từ chối giao dịch**."

_(Mở video, dừng lại ở thông báo giao dịch bị chặn)_

---

## SLIDE 12 — DEMO: CHỐNG IDENTITY SPOOFING (45s)

"Kịch bản thứ ba: **giả mạo danh tính**. Đây là tài khoản 'Nguyễn Đức Đại', quyền `user` bình thường.

Em thử **sửa payload trong JWT để biến mình thành người dùng khác hoặc nâng quyền**. Nhưng JWT được **ký bằng ES256 (ECDSA)** — Keycloak giữ private key, các service chỉ có public key để verify. Vừa đổi một ký tự trong payload là **chữ ký không còn khớp**, hệ thống lập tức trả về **401 Unauthorized**. Không thể mạo danh ai khác."

_(Mở video, dừng ở phản hồi 401)_

---

## SLIDE 13 — DEMO: CHỐNG alg: none (45s)

"Kịch bản cuối — kỹ thuật kinh điển nhất: **tấn công `alg: none`**. Ý tưởng của attacker là **sửa header thuật toán của JWT thành `none` để xóa luôn phần chữ ký**, hòng lừa server bỏ qua bước xác minh.

Trong hệ thống của em, middleware xác minh JWT **ép cứng thuật toán ES256 (ECDSA)** — bất kỳ token nào khai báo `none` hay thuật toán khác đều **bị từ chối ngay**, không cần xét tới nội dung. Đây là điểm mà rất nhiều hệ thống thực tế dính lỗ hổng, còn hệ thống của em đã chặn từ gốc.

_(Mở video, dừng ở kết quả bị reject)_

Như vậy là đủ 4 kịch bản: thanh toán an toàn, chống sửa gói tin, chống mạo danh, và chống `alg: none`. Em xin chuyển sang phần kết luận."

---

## KẾT LUẬN (30s)

"Đồ án đã chứng minh: Việc đưa mật mã vào bảo vệ hệ thống vi dịch vụ là hoàn toàn khả thi trên thực tế, đảm bảo an toàn từ cửa ngõ đến Database với chi phí hiệu năng cực thấp nhờ kiến trúc Defense in Depth và Zero Trust.

Cảm ơn hội đồng đã lắng nghe. Nhóm xin phép nhận câu hỏi phản biện."

---

# PHẦN HỎI — ĐÁP (Chuẩn bị sẵn cho phản biện trực diện)

**(Trọng tâm kỹ thuật để giải thích nguyên lý thiết kế)**

**Hỏi: Tại sao không làm monolith (nguyên khối) cho đơn giản mà phải dùng microservices?**
"Mục đích cốt lõi của đồ án là ứng dụng mật mã vào mạng lưới phân tán. Kiến trúc Monolith chia sẻ chung vùng nhớ, không có ranh giới mạng nội bộ, nên các cơ chế trọng tâm như: xác thực API nội bộ bằng HMAC, quản lý khóa phân tán với Vault, hay chữ ký sự kiện Kafka sẽ mất đi ý nghĩa. Microservices là điều kiện bắt buộc để bộc lộ và thử nghiệm các giải pháp mật mã này."

**Hỏi: Giao tiếp giữa Order và Payment tại sao dùng HMAC mà không truyền thẳng JWT của user?**
"JWT chỉ chứng minh 'ai là người dùng', không chứng minh được 'ai là dịch vụ đang gọi'. HMAC kèm timestamp giải quyết được cả 2: Xác minh định danh của dịch vụ gọi (Order) và chống tấn công Replay Attack. Ngoài ra, tốc độ băm HMAC đối xứng nhanh hơn rất nhiều so với xác minh chữ ký phi đối xứng của JWT, cực kỳ tối ưu cho API nội bộ gọi liên tục."

**Hỏi: AES-256-GCM dùng mã hóa DB có ưu điểm gì so với AES-CBC?**
"AES-GCM là chế độ Authenticated Encryption (Mã hóa có xác thực). GCM sinh ra một thẻ Tag (MAC) đi kèm để đảm bảo tính toàn vẹn của Ciphertext. Nếu hacker truy cập thẳng vào Database sửa đổi bit mã hóa, hàm giải mã sẽ quăng lỗi ngay lập tức. Tính năng này chặn đứng hoàn toàn các cuộc tấn công padding oracle hay bit-flipping (các kỹ thuật lợi dụng điểm yếu thuật toán cũ để đảo ngược hoặc sửa dữ liệu) vốn là điểm yếu của AES-CBC."

**Hỏi: Vault AppRole hoạt động như thế nào, làm sao an toàn hơn file .env?**
"Thay vì dùng một khóa tĩnh sống vĩnh viễn (như .env), AppRole cấp quyền qua 2 tham số: `RoleID` (dạng public) và `SecretID` (dạng private, tự động xoay vòng thay mới liên tục). AppRole sinh ra một Token có vòng đời cực ngắn (TTL) và chỉ cấp quyền truy cập theo đúng thư mục (path) được phân. Ngay cả khi hacker chiếm được 1 container cũng không thể lấy được Master Key để xâm nhập các tài nguyên khác."

---

# PHỤ LỤC: TỪ ĐIỂN KIẾN TRÚC & MẬT MÃ (Dành cho vấn đáp)

**1. Các Triết Lý Bảo Mật Cốt Lõi:**

- **Zero Trust:** Không tin tưởng bất cứ ai, dù là request từ ngoài hay trong mạng nội bộ. Xác thực và cấp quyền cho mọi tương tác.
- **Defense in Depth:** Lớp 1 (Envoy WAF/Rate Limit) -> Lớp 2 (JWT Auth) -> Lớp 3 (HMAC Internal Auth) -> Lớp 4 (Mã hóa Database). Thủng 1 lớp không sập toàn bộ.
- **PCI Scope:** Kỹ thuật thu hẹp khu vực hạ tầng dính dáng đến dữ liệu thẻ, cô lập mạng Payment giúp giảm chi phí kiểm định PCI-DSS hằng năm.

**2. Mật mã ứng dụng:**

- **Symmetric (AES-256-GCM):** Mã hóa tĩnh PII (Tên, Địa chỉ). Giao tiếp với Vault qua `VaultTransit` API.
- **Asymmetric (ES256 / ECDSA):** Keycloak giữ Private Key (đường cong elliptic) ký JWT. Services giữ Public Key xác minh. Kiến trúc lý tưởng cho phân tán vì không chia sẻ Private Key; chữ ký ECDSA ngắn gọn hơn RSA nên token nhẹ và verify nhanh.
- **HMAC (Hash-based Message Authentication Code):** Sinh chữ ký API nội bộ. Đảm bảo toàn vẹn dữ liệu, chống mạo danh.
- **Envelope Encryption (Mã hóa bao thư):** Dùng Data Encryption Key (DEK) mã hóa dữ liệu, sau đó dùng Key Encryption Key (KEK) mã hóa DEK. Giúp hệ thống dễ dàng Key Rotation định kỳ mà không phải giải mã lại toàn bộ Database.
- **Tokenization (Stripe):** Thẻ thật được cổng thanh toán đổi thành chuỗi Token ngẫu nhiên (chỉ có ý nghĩa 1 chiều). Hệ thống nội bộ lưu Token này, triệt tiêu rủi ro lộ số thẻ.

**3. Cơ sở hạ tầng Phân Tán:**

- **Envoy Proxy:** Edge Proxy (Cửa ngõ ngoài cùng chặn mọi kết nối lạ), xử lý TLS Termination, Rate Limit và JWT decode ban đầu.
- **Apache Kafka:** Giao tiếp bất đồng bộ, payload được ký ECDSA (băm SHA-256) chống bơm message độc giả mạo.
- **Saga Pattern & Idempotency:** Xử lý lỗi giao dịch liên chuỗi (Saga tự động rollback/hoàn tồn kho). Idempotency (tính lũy đẳng - cơ chế đảm bảo một request dù bị gọi lặp nhiều lần vẫn chỉ trừ tiền 1 lần) chặn nguy cơ bị gọi lặp request gây trừ tiền khách nhiều lần bằng Header `Idempotency-Key`.
- **WireGuard (Tailscale):** Mạng Overlay mã hóa E2E (End-to-End) toàn bộ các node, chặn các port nhạy cảm khỏi Public Internet.

## Khối Giao tiếp Ngoại vi (Client + Edge/Identity)

- Envoy tiếp nhận toàn bộ traffic từ bên ngoài, chịu trách nhiệm _TLS Termination_ (là quá trình giải mã các yêu cầu được mã hóa (HTTPS/TLS) tại một điểm trung gian trước khi chuyển tiếp dữ liệu đó đến máy chủ đích dưới dạng chưa mã hóa HTTP), xác thực request, định tuyến (Routing) và cân bằng tải (Load Balancing).
- Keycloak là IdP (Identity Provider), chịu trách nhiệm xác thực tài khoản và xác nhận role của tài khoản đó.
- Envoy sẽ tiếp nhận các request, check xem request đó đã có JWT ( Json Web Token, nó chứa thông tin như User ID, thời gian hết hạn, và đặc biệt là có chữ ký điện tử của Keycloak để không ai có thể làm giả) chưa (nếu có rồi thì chuyển tới backend, chưa thì cho qua Keycloak).
- **HashiCorp Vault** hoạt động như một két sắt trung tâm để quản lý vòng đời của các bí mật trong cụm máy chủ.
- Vault chuyên lưu trữ **external credentials (VD: API Keys)**; lưu trữ **các encryption keys** cho tất cả các cơ sở dữ liệu; và bảo vệ các khóa có giá trị cực cao như **khóa quản trị của Cổng thanh toán (PSP admin keys)** để tránh việc kẻ tấn công xâm nhập và thao túng giao dịch.

# Keycloak

Về bản chất, Keycloak là một nền tảng Quản lý Định danh và Truy cập (Identity and Access Management - IAM) độc lập. Nó được tích hợp sẵn một máy chủ giao diện (Web Server) chứa mã nguồn HTML, CSS và JavaScript.

- Khi người dùng cần đăng nhập, hệ thống sẽ điều hướng họ đến thẳng các trang web do Keycloak cung cấp.
- Các giao diện này được quản lý qua cơ chế **Theme** (Giao diện mẫu). Đội ngũ phát triển hoàn toàn có thể tùy biến CSS/HTML để trang đăng nhập của Keycloak trông giống hệt với thiết kế của sàn thương mại điện tử.
  **Keycloak còn chứa những thành phần cốt lõi nào khác?** Ngoài giao diện đăng nhập, Keycloak là một "pháo đài" chứa các module sau:

1. **Cơ sở dữ liệu người dùng (User Store):** Nơi lưu trữ thông tin đăng nhập, mật khẩu (đã được băm mã hóa một chiều - Hashing), và các thuộc tính cơ bản.
2. **Bộ máy cấp phát Token (Token Issuer Engine):** Module chịu trách nhiệm chạy các thuật toán mã hóa (như đã phân tích ở phần JWT) để sinh ra, gia hạn hoặc thu hồi Token.
3. **Trình quản lý Phiên (Session Management):** Theo dõi xem ai đang đăng nhập, thiết bị nào đang được sử dụng. Nếu bạn bấm "Đăng xuất khỏi mọi thiết bị", module này sẽ ra lệnh vô hiệu hóa toàn bộ Token của bạn.
4. **Cổng Liên kết Định danh (Identity Brokering):** Đây là module giúp hệ thống của bạn có nút _"Đăng nhập bằng Google/Facebook"_. Keycloak sẽ tự động đi nói chuyện với Google, lấy thông tin về và quy chuẩn lại thành JWT nội bộ của hệ thống bạn.
5. **Bảng điều khiển Quản trị (Admin Console):** Một giao diện dành riêng cho Admin để tạo người dùng mới, phân quyền (Role-Based Access Control), hoặc cấu hình mức độ bảo mật (như ép buộc xác thực 2 lớp - 2FA).
   Keycloak tạo và kí JWT bằng thuật toán ES256 (ECDSA).

## mTLS (Mutual Transport Layer Security)

> ⚠️ **TRẠNG THÁI THỰC TẾ (đọc kỹ trước khi trả lời phản biện):** Trong bản chạy hiện tại, **mTLS chưa hoạt động đầy đủ** — đang phải hardcode do vướng cấu hình route giữa các service. Vì vậy, lớp xác thực service-to-service đang dựa vào **chữ ký HMAC + timestamp** (cộng JWT mang danh tính user), chứ **không** nên trình bày mTLS như cơ chế đang chạy.
>
> **Nếu hội đồng hỏi "có dùng mTLS không?":** trả lời thẳng — *"mTLS đã được thiết kế trong kiến trúc, nhưng ở bản hiện tại còn vướng cấu hình routing nên đang là hạng mục backlog; hiện tại giao tiếp nội bộ được bảo vệ bằng HMAC + timestamp kèm danh tính JWT, vẫn đủ chống service giả mạo và replay."* — đây là cách trả lời trung thực, đúng tinh thần mục 8.2 (tìm và vá lỗ hổng thật là một phần của đồ án).

Là một cơ chế xác thực hai chiều bắt buộc **cả hai bên** giao tiếp phải xuất trình chứng chỉ điện tử - certificate để xác minh lẫn nhau trước khi trao đổi dữ liệu.
Trong nền tảng thương mại điện tử, mTLS không dùng cho khách hàng bên ngoài mà được áp dụng triệt để cho giao tiếp nội bộ giữa các Microservices. Mỗi dịch vụ được cấp một danh tính riêng (thông qua hệ thống như SPIFFE/SPIRE hoặc lưới dịch vụ Istio) kèm theo một chứng chỉ điện tử để liên lạc. Toàn bộ các lời gọi API nội bộ này đều được xác thực và cấp quyền nghiêm ngặt dựa trên nguyên tắc đặc quyền tối thiểu (least privilege).

- **Chống dịch vụ giả mạo**: Nhờ có mTLS, dịch vụ giả mạo không sở hữu chứng chỉ do hệ thống cấp phát. Các dịch vụ thật khác sẽ **từ chối kết nối ngay lập tức** vì không xác minh được danh tính đối phương.
- **Bảo vệ dữ liệu không bị nghe lén nội bộ**: Mọi dữ liệu truyền giữa các dịch vụ bên trong (như thông tin cá nhân, đơn hàng) đều được mã hóa hoàn toàn.

* **Loại bỏ việc "giấu" mật khẩu trong mã nguồn**: Thông thường, các hệ thống cũ hay dùng các mật khẩu tĩnh giấu trong mã nguồn. Với mTLS, hệ thống dùng các chứng chỉ điện tử có **thời gian sống cực kỳ ngắn (short-lived certs)** và liên tục tự động gia hạn (auto-rotation). Do đó, kẻ tấn công có trộm được một chứng chỉ, nó cũng sẽ rất nhanh chóng hết hạn và trở nên vô dụng.

## PCI-DSS

**PCI-DSS** (Payment Card Industry Data Security Standard - Tiêu chuẩn Bảo mật Dữ liệu Ngành Thẻ Thanh toán) là một bộ tiêu chuẩn an ninh thông tin bắt buộc dành cho **bất kỳ tổ chức nào** có liên quan đến việc xử lý, lưu trữ hoặc truyền tải dữ liệu thẻ tín dụng.
Tiêu chuẩn này áp dụng cho tất cả các thực thể có liên quan đến quá trình xử lý tài khoản thanh toán (bao gồm người bán, bộ phận xử lý, tổ chức phát hành, nhà cung cấp dịch vụ) có lưu trữ, xử lý, truyền tải dữ liệu chủ thẻ (CHD - Cardholder Data) và dữ liệu xác thực nhạy cảm (SAD - Sensitive Authentication Data), hoặc các hệ thống có thể ảnh hưởng đến bảo mật của các dữ liệu này.
Mục tiêu cốt lõi của PCI-DSS rất đơn giản: **Bảo vệ dữ liệu của chủ thẻ khỏi bị đánh cắp và ngăn chặn gian lận giao dịch.**

## Idempotency-Key

Trong môi trường mạng, đôi khi yêu cầu đã gửi đi thành công nhưng phản hồi từ Server lại bị thất lạc. Lúc này, Client sẽ tự động gửi lại yêu cầu đó.

- **Nếu không có Idempotency:** có thể bị đặt 2 đơn hàng, trừ tiền 2 lần.
- **Nếu có Idempotency:** Server nhận diện được đây là yêu cầu cũ thông qua cái "Key", nó sẽ không xử lý lại mà trả ngay kết quả của lần xử lý đầu tiên.

## HMAC

Là một kỹ thuật mã hóa dùng để tạo ra một "mã xác thực" hoặc "chữ ký" bảo vệ một khối dữ liệu. Nó hoạt động dựa trên sự kết hợp giữa một **hàm băm** (như SHA-256) và một **khóa bí mật**. Xem nó như cơ chế tạo ra một tem chống giả đi kèm dữ liệu.
**Cơ chế hoạt động cốt lõi:**

1. Cả hệ thống gửi và hệ thống nhận đều phải chia sẻ chung một khóa bí mật (secret key) mà người ngoài không biết.
2. Khi bên gửi muốn truyền dữ liệu, họ sẽ trộn dữ liệu gốc đó với khóa bí mật rồi cho qua hàm băm để tạo ra một chuỗi ký tự đặc biệt gọi là chuỗi HMAC (chữ ký).
3. Bên gửi truyền đi cả dữ liệu gốc và chuỗi HMAC.
4. Khi hệ thống nhận được dữ liệu, nó sẽ tự lấy dữ liệu gốc đó kết hợp với khóa bí mật đang giữ để tính toán ra một chuỗi HMAC thứ hai.
5. Nếu chuỗi HMAC tự tính khớp hoàn toàn với chuỗi HMAC được gửi tới, hệ thống có thể khẳng định chắc chắn 100% hai điều: **Dữ liệu chưa bị ai can thiệp/chỉnh sửa trên đường đi** và **Dữ liệu chắc chắn xuất phát từ người giữ khóa hợp lệ**.
