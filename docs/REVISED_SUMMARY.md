# 1. Tóm tắt đồ án

Thương mại điện tử xử lý dữ liệu nhạy cảm - thông tin định danh cá nhân (PII) và dữ liệu thanh toán - trên hạ tầng phân tán, nơi mỗi đường truyền giữa các thành phần đều là một bề mặt tấn công. Đồ án thiết kế, triển khai và đánh giá định lượng một nền tảng thương mại điện tử dạng microservices gồm 7 dịch vụ, với trọng tâm là áp dụng và đo lường các cơ chế mật mã học trong môi trường vận hành thực tế, thay vì chỉ mô tả lý thuyết.

Hệ thống triển khai tám cơ chế mật mã trải trên năm lớp bảo mật: (1) TLS 1.3 cho lớp truyền tải; (2) OAuth2 Authorization Code + PKCE (sử dụng JWT Access Token) cho lớp xác thực; (3) HMAC-SHA256 + nonce + timestamp cho toàn vẹn giao tiếp service-to-service; (4) PSP tokenization để loại bỏ hoàn toàn số thẻ (PAN) khỏi hệ thống; (5) quản lý khóa bằng HashiCorp Vault với mô hình envelope encryption; (6) mã hóa cơ sở dữ liệu hai tầng TDE + FLE; (7) nhật ký kiểm toán append-only; và (8) API Gateway/WAF làm điểm đón và lọc biên (Ingress/Edge Gateway). Hệ thống chạy thật trên 4 node kết nối qua Tailscale WireGuard, với Stripe ở chế độ test, Keycloak cấp phát JWT và Vault Transit đang vận hành.

Qua quá trình thực nghiệm, đồ án cho thấy các điểm yếu mật mã trong thực tế hiếm khi xuất phát từ bản thân thuật toán, mà phần lớn bắt nguồn từ những khiếm khuyết trong khâu triển khai và vận hành hệ thống. Cụ thể, việc xác định sai ranh giới tin cậy (trust boundaries), quản lý cấu hình bảo mật thiếu đồng bộ, lỗi logic khi xử lý ngoại lệ (semantic error handling), và việc tồn tại các cơ chế dự phòng ẩn (silent fallbacks) đã trực tiếp làm suy giảm hiệu quả phòng thủ, từ đó gây ra trạng thái "an toàn ảo" (false sense of security) đe dọa toàn bộ kiến trúc hệ thống.

# 2. Lý do chọn đề tài

Các nền tảng thương mại điện tử hiện nay (như Amazon, Shopee, Tiki...) phải xử lý liên tục một khối lượng lớn dữ liệu nhạy cảm, bao gồm thông tin định danh cá nhân (PII) và dữ liệu giao dịch tài chính. Những luồng dữ liệu này luôn chịu sự ràng buộc khắt khe từ các tiêu chuẩn bảo mật quốc tế (điển hình như PCI DSS) và các quy định bảo vệ quyền riêng tư. Một sự cố rò rỉ không chỉ gây tổn thất trực tiếp về tài chính mà còn hủy hoại uy tín và kéo theo các rủi ro pháp lý nghiêm trọng cho doanh nghiệp.

Bên cạnh đó, để đáp ứng khả năng mở rộng, các hệ thống này hầu hết đều chuyển dịch sang kiến trúc phân tán (microservices). Bề mặt tấn công theo đó cũng được mở rộng: mỗi kết nối giao tiếp qua mạng nội bộ đều trở thành một điểm có nguy cơ bị nghe lén, giả mạo hoặc chịu tấn công lặp lại (replay attack). Bối cảnh thực tiễn này đòi hỏi các cơ chế mật mã phải được đưa ra khỏi khuôn khổ lý thuyết để áp dụng vào thực tế. Đây chính là động lực chính để đồ án lựa chọn xây dựng kiến trúc thương mại điện tử phân tán, qua đó tạo ra môi trường cụ thể nhằm triển khai, kiểm chứng và đo lường trực tiếp hiệu quả của các lớp bảo mật mật mã.

# 3. Đối tượng nghiên cứu

Đồ án tập trung nghiên cứu việc ứng dụng các cơ chế mật mã (applied cryptography) vào hệ thống thương mại điện tử dựa trên kiến trúc phân tán (microservices). Phạm vi nghiên cứu bao quát từ khía cạnh thiết kế kiến trúc (bao gồm lựa chọn thuật toán mật mã cốt lõi và thiết lập mức độ tin cậy giữa các thành phần) cho đến khía cạnh triển khai vận hành thực tế (như cấu hình tham số, xử lý ngoại lệ và quản lý khóa).

# 4. Câu hỏi và giả thuyết nghiên cứu

**Câu hỏi nghiên cứu:**

- **RQ1:** Những điểm yếu mật mã nào (cấu hình TLS sai, quản lý khóa lỏng lẻo, mã hóa lưu trữ yếu kém) thường bị tin tặc lợi dụng để xâm phạm hệ thống và đánh cắp dữ liệu người dùng trong thực tế?
- **RQ2:** Cơ chế xác thực thông điệp (HMAC-SHA256, Nonce) và Tokenization ngăn chặn các thủ đoạn gian lận tài chính (sửa đổi payload thanh toán, tấn công lặp lại) và đảm bảo tính chống chối bỏ (non-repudiation) cho các giao dịch như thế nào để bảo vệ tuyệt đối quyền lợi người dùng?

**Giả thuyết nghiên cứu:**
Việc thiết lập phòng thủ mật mã đa lớp — sử dụng HMAC và Nonce để chặn đứng gian lận và đảm bảo tính toàn vẹn cũng như chống chối bỏ trong các giao dịch nội bộ, cùng với PSP Tokenization để loại bỏ hoàn toàn rủi ro lộ dữ liệu thẻ — sẽ bẻ gãy các chuỗi tấn công (attack chains) nguy hiểm nhất. Mô hình này tạo ra một lá chắn bảo mật vững chắc cho danh tính và tài sản của người dùng. Đồng thời, độ trễ tính toán phát sinh từ các phép toán mật mã (chỉ từ 3–28 ms) là hoàn toàn không đáng kể, chứng minh hệ thống có thể chống chịu các đợt tấn công phức tạp mà không làm suy giảm trải nghiệm mua sắm.

# 5. Các trích đoạn/ghi chú thêm

Thông tin thẻ thanh toán là dữ liệu nhạy cảm và cần tuân thủ tiêu chuẩn PCI DSS; do đó, hướng tiếp cận an toàn thường được khuyến nghị là hạn chế tối đa việc để luồng dữ liệu này đi qua hoặc lưu trữ trực tiếp trên hệ thống nội bộ.

# 6. Lựa chọn thuật toán và Cơ chế mã hóa dữ liệu

Hệ thống sử dụng mật mã khóa đối xứng **AES-256**, đảm bảo biên độ an toàn dài hạn (~128-bit) ngay cả khi đối mặt với rủi ro điện toán lượng tử (thuật toán Grover).

Vì AES là mật mã khối, hệ thống tích hợp chế độ **GCM (Galois/Counter Mode)** thuộc nhóm mã hóa có xác thực (AEAD). GCM đồng thời cung cấp ba thuộc tính bảo mật cốt lõi:

- **Tính bí mật:** Dữ liệu mã hóa dòng qua cơ chế đếm CTR.
- **Tính toàn vẹn và Xác thực:** Tự động đính kèm thẻ xác thực (tag) 128-bit. Việc giải mã sẽ bị từ chối lập tức nếu dữ liệu (ciphertext) bị sửa đổi.

Để duy trì tính an toàn tối đa cho GCM, hệ thống tuân thủ nghiêm ngặt nguyên tắc không tái sử dụng giá trị khởi tạo (Nonce/IV). Codebase sử dụng hàm sinh số giả ngẫu nhiên an toàn mật mã (`os.urandom`) để tạo Nonce 96-bit độc nhất cho mỗi chu kỳ mã hóa (xem mã nguồn ở mục 3.3.6). Cuối cùng, nhờ khả năng tương thích tập lệnh tăng tốc phần cứng AES-NI, kiến trúc này đạt thông lượng xử lý cực cao (mục 4.5: ~2,2 triệu phép/giây) mà không gây nghẽn cổ chai hệ thống.

Bên cạnh đó, để ngăn chặn tấn công đo thời gian (timing attack), quá trình xác thực chữ ký sử dụng hàm đối chiếu có thời gian thực thi không đổi (`hmac.compare_digest`).

# 7. Chữ ký số và Mật mã khóa bất đối xứng

Hệ thống ứng dụng chữ ký số (mật mã khóa bất đối xứng) nhằm đảm bảo **xác thực nguồn gốc** và **tính chống chối bỏ** (non-repudiation). Người gửi dùng khóa riêng (private key) để ký, người nhận dùng khóa công khai (public key) để xác minh.

Thay vì dùng RSA (phụ thuộc bài toán phân tích thừa số nguyên lớn với khóa rất dài), đồ án chọn **ECDSA trên đường cong P-256**. ECDSA đạt cùng mức an toàn (~128-bit) nhưng tối ưu hơn hẳn về kích thước (khóa 256-bit tương đương RSA 3072-bit).

Kỹ thuật này được áp dụng cho hai nghiệp vụ:

- **Ký JWT:** Keycloak độc quyền giữ khóa riêng để ký token bằng **ES256** (ECDSA P-256 + SHA-256). Các vi dịch vụ lấy khóa công khai qua JWKS để tự xác minh.
- **Ký Audit Log:** Dùng khóa `payment-sign-key` (chuẩn ECDSA-P256) qua Vault Transit Engine để ký bản ghi kiểm toán (xem mục 3.3.7).

# 8. Tách bạch đặc quyền trong xác thực Token

Để ký và xác minh JWT, đồ án quyết định sử dụng thuật toán bất đối xứng **ES256** thay vì thuật toán đối xứng (như HMAC-SHA256). Lựa chọn này nhằm giải quyết triệt để bài toán **tách bạch đặc quyền (Privilege Separation)**.

Nếu dùng thuật toán đối xứng, hệ thống phải chia sẻ chung một khóa bí mật cho cả bên tạo token và bên kiểm tra token. Điều này vô cùng rủi ro: chỉ cần một vi dịch vụ (microservice) bị xâm nhập, kẻ tấn công sẽ lấy được khóa bí mật và có thể tự do làm giả token để đánh lừa toàn bộ hệ thống.

Thuật toán bất đối xứng ES256 khắc phục điểm yếu này bằng cách sử dụng một cặp khóa:

1. **Khóa riêng tư (Private Key) để tạo chữ ký:** Chỉ duy nhất máy chủ định danh (Keycloak) được phép giữ khóa này để phát hành token. Khóa này được bảo vệ nghiêm ngặt tại một nơi duy nhất.
2. **Khóa công khai (Public Key) để xác minh:** Các vi dịch vụ khác tải khóa này về chỉ để kiểm tra xem token có hợp lệ hay không. Khóa công khai hoàn toàn vô hại, không thể dùng để làm giả token.

Sự phân tách rõ ràng giữa "quyền phát hành" và "quyền xác minh" giúp khoanh vùng rủi ro. Ngay cả khi một vi dịch vụ bị tổn hại, tin tặc cũng không thể tự tạo ra danh tính giả mạo. Tuy nhiên, nền tảng vẫn phải chủ động cài đặt các bước kiểm tra chặt chẽ trong code để chống lại các lỗ hổng JWT cơ bản như thao túng thuật toán hay tái sử dụng token cũ.
