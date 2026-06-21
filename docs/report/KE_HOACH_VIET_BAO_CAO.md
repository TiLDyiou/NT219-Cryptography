# KẾ HOẠCH VIẾT BÁO CÁO KHÓA LUẬN / ĐỒ ÁN NT219

> **Mục tiêu:** Chuyển toàn bộ tài liệu kỹ thuật hiện có thành một cuốn báo cáo đúng bố cục & hình thức quy định của UIT (theo Phụ lục 2 + Phụ lục 3), tối thiểu 50 trang A4.
>
> **Đề tài:** Thiết kế & Đánh giá An toàn Mật mã cho Nền tảng Thương mại Điện tử (Microservices E-commerce).
>
> **Nguồn chính để tái sử dụng:** `docs/BAO_CAO_DO_AN_NT219.md` (báo cáo kỹ thuật 12 mục, ~1187 dòng) + các tài liệu phụ liệt kê ở mục 4.

---

## 1. Yêu cầu hình thức bắt buộc (từ Phụ lục 2)

Đây là checklist KHÔNG được sai khi nộp:

- [ ] Font **Times New Roman, 13pt**, Unicode.
- [ ] Dãn dòng **1.5 lines**.
- [ ] Lề: **trên 3 cm, dưới 3.5 cm, trái 3.5 cm, phải 2 cm**.
- [ ] Đánh số trang **Ả-rập, giữa dưới**, bắt đầu từ **Tóm tắt** (các trang bìa/mục lục/danh mục KHÔNG đánh số).
- [ ] Tiêu đề chương: `Chương N` bold size 14; mục con `N.1`, `N.1.1` bold size 13.
- [ ] Đánh số **hình/bảng theo chương**: `Hình 1.1`, `Bảng 2.3`… mỗi hình/bảng có caption + nguồn.
- [ ] Số chương dùng **số Ả-rập** (không La Mã).
- [ ] Tài liệu tham khảo **chuẩn IEEE**, tách riêng tiếng Việt / tiếng Anh, sắp xếp alphabet.
- [ ] Nội dung **tối thiểu 50 trang, không quá 100 trang** (không kể bìa, mục lục, TLTK).
- [ ] Tóm tắt (Abstract) dài **1–2 trang**.

---

## 2. Cấu trúc cuốn báo cáo (thứ tự đóng quyển — từ Phụ lục 2 & 3)

Phần đầu (không đánh số trang):
1. Bìa chính
2. Bìa phụ
3. Thông tin hội đồng chấm KLTN
4. Lời cảm ơn
5. Mục lục
6. Danh mục hình
7. Danh mục bảng
8. Danh mục từ viết tắt

Phần nội dung (bắt đầu đánh số trang):
9. **Tóm tắt (Abstract)**
10. Các chương (xem mục 3)
11. Tài liệu tham khảo (IEEE)
12. Phụ lục

---

## 3. Ánh xạ NỘI DUNG → CHƯƠNG (kế hoạch viết chi tiết)

Bố cục học thuật của UIT (Mở đầu → Tổng quan → Lý thuyết/Phương pháp → Kết quả/Đánh giá → Kết luận → Hướng phát triển). Dưới đây là đề xuất chia chương kèm nguồn tái sử dụng và việc cần làm.

### Tóm tắt (Abstract) — 1–2 trang
- **Nội dung:** vấn đề, hướng tiếp cận (microservices + 8 cơ chế mật mã), kết quả nổi bật (26 tests, overhead 3–28ms, OWASP scorecard).
- **Nguồn:** `BAO_CAO_DO_AN_NT219.md` §1.1, §11.4.
- **Việc cần làm:** viết mới, cô đọng. Có bản tiếng Anh nếu yêu cầu.

### Chương 1 — MỞ ĐẦU (Problem Statement)
- 1.1 Lý do chọn đề tài (TMĐT + nhu cầu mật mã thực tế).
- 1.2 Mục tiêu đề tài.
- 1.3 Đối tượng & phạm vi nghiên cứu.
- 1.4 Câu hỏi nghiên cứu (RQ1–RQ3) & giả thuyết.
- 1.5 Phương pháp thực hiện (tổng quan).
- 1.6 Bố cục báo cáo.
- **Nguồn:** `BAO_CAO_DO_AN_NT219.md` §1 (toàn bộ); `README.md` (lý do microservices vs monolith).
- **Việc cần làm:** viết lại theo văn phong học thuật, thêm 1.5 & 1.6.

### Chương 2 — TỔNG QUAN & CƠ SỞ LÝ THUYẾT (Background / Related work)
- 2.1 Tổng quan TMĐT & các nền tảng tham khảo (Amazon, Shopee) + thực trạng bảo mật.
- 2.2 Kiến trúc Microservices vs Monolith (trade-off).
- 2.3 Cơ sở lý thuyết mật mã: TLS 1.3, OAuth2/OIDC/PKCE, HMAC-SHA256, đối xứng/bất đối xứng, envelope encryption, KMS/HSM, tokenization PSP.
- 2.4 Mô hình hóa mối đe dọa STRIDE & các tiêu chuẩn (OWASP ASVS, API Top 10, PCI DSS).
- 2.5 Các công trình/giải pháp liên quan & khoảng trống đề tài giải quyết.
- **Nguồn:** `README.md` §1–2; `docs/17_Application Scenarios...md`; `BAO_CAO_DO_AN_NT219.md` §4 (phần lý thuyết của từng cơ chế).
- **Việc cần làm:** **BỔ SUNG cơ sở lý thuyết** (hiện tài liệu nghiêng về triển khai, thiếu nền lý thuyết & related work có trích dẫn IEEE).

### Chương 3 — THIẾT KẾ HỆ THỐNG & CÁC CƠ CHẾ MẬT MÃ (Model/Method)
- 3.1 Kiến trúc tổng thể (4 node, sơ đồ).
- 3.2 Chi tiết 7 microservices & trách nhiệm.
- 3.3 Trust Boundaries & Data Flow Diagram (8 ranh giới).
- 3.4 Triển khai 8 cơ chế mật mã (4.1–4.8 báo cáo cũ): TLS, OAuth2/OIDC+MFA, HMAC S2S, PSP tokenization, Vault KMS, DB encryption (TDE+FLE), audit log append-only, WAF/Gateway.
- 3.5 Checkout Flow — Saga pattern, compensation, idempotency.
- 3.6 Phân tích STRIDE (~50 threat) & mitigations.
- **Nguồn:** `BAO_CAO_DO_AN_NT219.md` §2, §3, §4, §5, §6; `docs/stride_threat_model.md`; `NT219-Cryptography-threat-model.md`; `docs/data_flow_diagram.md`; ADRs.
- **Việc cần làm:** đây là chương dày nhất; chèn sơ đồ (`architecture.drawio`, `topology.drawio`, PNG). Rút gọn code dài thành snippet minh họa + đưa code đầy đủ xuống Phụ lục.

### Chương 4 — THỰC NGHIỆM & ĐÁNH GIÁ KẾT QUẢ (Evaluation/Results)
- 4.1 Môi trường & phương pháp thực nghiệm (live system, Stripe test, 5000 iterations).
- 4.2 Lỗ hổng phát hiện & đã sửa (T1–T4).
- 4.3 Kết quả 5 nhóm security experiments (26 tests).
- 4.4 Static analysis & pentest.
- 4.5 Hiệu năng mật mã (overhead per request, median/p95/p99).
- 4.6 Đối chiếu chuẩn: OWASP ASVS L2, API Top 10, PCI DSS scorecard.
- 4.7 Bàn luận kết quả (so với giả thuyết).
- **Nguồn:** `BAO_CAO_DO_AN_NT219.md` §7–10; `docs/SECURITY_BENCHMARK_TESTS.md`; `docs/BENCHMARK_RESULTS.md`; `docs/PENTEST_NGROK_REPORT.md`; `docs/pentest/*.py`; `SERVICES_CODEBASE_REVIEW.md`.
- **Việc cần làm:** chuyển số liệu thành **bảng + biểu đồ** có caption; mỗi experiment nêu rõ mục tiêu/cách làm/kết quả.

### Chương 5 — KẾT LUẬN (Conclusion)
- 5.1 Kết quả đạt được & trả lời RQ1–RQ3.
- 5.2 Đóng góp của đề tài.
- 5.3 Hạn chế (mTLS mesh còn backlog, ES256 chưa vào repo — xem ghi chú live state).
- **Nguồn:** `BAO_CAO_DO_AN_NT219.md` §11.
- **Việc cần làm:** ngắn gọn, không bình luận thêm (theo yêu cầu PL2).

### Chương 6 — HƯỚNG PHÁT TRIỂN (Future work)
- mTLS sidecar mesh, hoàn tất ES256 migration vào repo, mở rộng key rotation tự động, HSM thật, mở rộng quy mô.
- **Nguồn:** `BAO_CAO_DO_AN_NT219.md` §12.F (Backlog); ghi chú live deploy state.

### Tài liệu tham khảo (IEEE)
- **Việc cần làm:** thu thập & format IEEE: RFC (TLS 1.3 RFC 8446, OAuth2 RFC 6749, PKCE RFC 7636, HMAC RFC 2104), tài liệu Keycloak/Envoy/Vault/Stripe, OWASP ASVS/API Top 10, PCI DSS v4.0, NIST. Tách Việt/Anh.

### Phụ lục báo cáo
- A. Cấu trúc repository.
- B. Security libraries & versions.
- C. Envoy JWT filter config, Vault provisioning script, Kafka topics.
- D. Hướng dẫn cài đặt/triển khai (từ `DEPLOY-GUIDE.md`, `TAILSCALE_DEPLOYMENT.md`).
- E. Mã nguồn các cơ chế mật mã (snippet đầy đủ).
- **Nguồn:** `BAO_CAO_DO_AN_NT219.md` §12; `docs/DEPLOY-GUIDE.md`; `docs/TAILSCALE_DEPLOYMENT.md`.

---

## 4. Bảng kho tài liệu nguồn (inventory)

| Tài liệu | Dùng cho chương |
|---|---|
| `docs/BAO_CAO_DO_AN_NT219.md` | Xương sống — tất cả chương |
| `docs/README.md` | Ch.1, Ch.2 (lý do kiến trúc, tech-stack) |
| `docs/17_Application Scenarios...md` | Ch.1, Ch.2 (bối cảnh đề bài) |
| `docs/stride_threat_model.md`, `NT219-Cryptography-threat-model.md` | Ch.3.6 |
| `docs/data_flow_diagram.md` | Ch.3.3 |
| `docs/ADRs/*` | Ch.3 (giải thích quyết định kiến trúc) |
| `docs/SECURITY_BENCHMARK_TESTS.md` (1564 dòng) | Ch.4.3 |
| `docs/BENCHMARK_RESULTS.md` | Ch.4.5 |
| `docs/PENTEST_NGROK_REPORT.md`, `docs/pentest/*.py` | Ch.4.4 |
| `SERVICES_CODEBASE_REVIEW.md` | Ch.4.2 |
| `docs/SECURITY_SYNTHESIS_PREDICTION.md` | Ch.4.7 (bàn luận) |
| `docs/DEPLOY-GUIDE.md`, `docs/TAILSCALE_DEPLOYMENT.md` | Phụ lục D |
| `docs/architecture.drawio`, `topology.drawio`, `enmerce_architecture_diagram_final_v4.png`, `slide6_deployment.drawio` | Hình minh họa các chương |
| `docs/SPEAKER_NOTES_DO_AN.md`, `THUYET_TRINH_DO_AN.md` | Tham khảo diễn giải, không đưa trực tiếp |

---

## 5. Khoảng trống cần bổ sung (GAP analysis)

1. **Cơ sở lý thuyết & related work có trích dẫn** — hiện thiếu; cần viết Ch.2.3–2.5 với nguồn IEEE.
2. **Danh mục Tài liệu tham khảo chuẩn IEEE** — chưa có; phải xây từ đầu.
3. **Hình/bảng có caption đánh số theo chương** — drawio/PNG cần export & gắn caption.
4. **Danh mục từ viết tắt** — gom: mTLS, HMAC, JWT, OIDC, PKCE, PSP, KMS, TDE, FLE, WAF, ASVS, PCI DSS, STRIDE…
5. **Lời cảm ơn, thông tin hội đồng, bìa** — điền theo mẫu PL3 (cần tên SV, MSSV, GVHD, tên ngành, năm).
6. **Đồng bộ trạng thái thật vs repo** — nêu rõ ES256 (live, chưa commit) & mTLS (backlog) ở Ch.5.3 để trung thực.
7. **Bản tiếng Anh tên đề tài & Abstract** (nếu hội đồng yêu cầu).

---

## 6. Thông tin còn THIẾU cần người dùng cung cấp

- Tên đầy đủ + MSSV các thành viên.
- Tên GVHD, Khoa, Ngành (Kỹ sư/Cử nhân).
- Tên đề tài tiếng Việt & tiếng Anh chính thức.
- Năm/thời gian thực hiện (đề cương PL1).
- Có cần bản tiếng Anh Abstract không.

---

## 7. Thứ tự thực hiện đề xuất

1. Chốt thông tin mục 6 (bìa, đề cương PL1).
2. Dựng khung file báo cáo (`BAO_CAO_KLTN.md` hoặc `.docx`) với đủ heading theo mục 2–3.
3. Đổ nội dung tái sử dụng vào Ch.1, 3, 4, 5, 6 (đã có sẵn ~80%).
4. Viết bổ sung Ch.2 (lý thuyết + related work) — phần tốn công nhất.
5. Export hình từ drawio/PNG, gắn caption & đánh số.
6. Xây danh mục TLTK chuẩn IEEE.
7. Hoàn thiện danh mục từ viết tắt, hình, bảng, mục lục.
8. Áp hình thức (font/lề/dãn dòng) — làm khi convert sang Word/PDF.
9. Rà số trang (đảm bảo ≥ 50 trang nội dung).
10. Soát chính tả, thống nhất thuật ngữ, kiểm tra trích dẫn.

---

## 8. Ước lượng độ dày

| Phần | Trang ước tính |
|---|---|
| Abstract | 1–2 |
| Ch.1 Mở đầu | 4–6 |
| Ch.2 Tổng quan & lý thuyết | 12–16 |
| Ch.3 Thiết kế & cơ chế mật mã | 18–24 |
| Ch.4 Thực nghiệm & đánh giá | 14–18 |
| Ch.5 Kết luận | 2–3 |
| Ch.6 Hướng phát triển | 1–2 |
| **Tổng nội dung** | **~52–71 trang** ✅ đạt yêu cầu ≥50 |
