// UIT Store — Merchant Settings Section

const MerchantSettingsSection = () => (
  <div>
    <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Cài đặt shop</h2>
    <div className="card" style={{ padding: 28, color: 'var(--ink-600)', lineHeight: 1.6 }}>
      Chưa có endpoint backend cho cài đặt shop. Màn hình này chỉ hiển thị khi backend cung cấp dữ liệu.
    </div>
  </div>
);

Object.assign(window, { MerchantSettingsSection });
