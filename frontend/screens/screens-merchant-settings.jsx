// UIT Store — Merchant Settings Section

const MerchantSettingsSection = ({ merchantId, user }) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [settings, setSettings] = React.useState(null);
  const [loading, setLoading]   = React.useState(true);
  const [saving, setSaving]     = React.useState(false);
  const [notice, setNotice]     = React.useState(null);
  const [draft, setDraft]       = React.useState(null);

  const hdr = () => {
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    return t
      ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }
      : { 'Content-Type': 'application/json', 'X-User-Id': user && user.id };
  };

  const showMsg = (msg, ok) => {
    setNotice({ msg, ok: ok !== false });
    setTimeout(() => setNotice(null), 3000);
  };

  React.useEffect(() => {
    if (!BASE) { setLoading(false); return; }
    fetch(`${BASE}/api/v1/settings/merchant/shop?merchant_id=${merchantId}`, { headers: hdr() })
      .then(r => r.json())
      .then(d => {
        const s = (d && d.data) || {};
        setSettings(s);
        setDraft({ ...s });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [merchantId]);

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const handleSave = () => {
    setSaving(true);
    fetch(`${BASE}/api/v1/settings/merchant/shop`, {
      method: 'PUT', headers: hdr(),
      body: JSON.stringify({ ...draft, merchant_id: merchantId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d && d.data) { setSettings(d.data); setDraft({ ...d.data }); showMsg('Lưu thành công'); }
        else showMsg('Lỗi lưu cài đặt', false);
      })
      .catch(() => showMsg('Lỗi kết nối', false))
      .finally(() => setSaving(false));
  };

  const inp = { padding: '8px 10px', border: '1px solid var(--ink-200)', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' };
  const fmtVND = (n) => new Intl.NumberFormat('vi-VN').format(n);

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-400)' }}>
      <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 10px' }} />
      Đang tải cài đặt...
    </div>
  );

  if (!draft) return null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Cài đặt shop</h2>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}>
          {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>

      {notice && (
        <div style={{ padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 13, fontWeight: 500,
          background: notice.ok ? '#ECFDF5' : '#FEF2F2', color: notice.ok ? '#065F46' : '#991B1B',
          border: `1px solid ${notice.ok ? '#6EE7B7' : '#FECACA'}` }}>
          {notice.msg}
        </div>
      )}

      {/* Thông tin shop */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="store" size={15} color="var(--primary)" /> Thông tin shop
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Tên shop</div>
            <input style={inp} value={draft.shop_name || ''} onChange={e => set('shop_name', e.target.value)} placeholder="Tên shop của bạn" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Mô tả shop</div>
            <textarea style={{ ...inp, height: 72, resize: 'vertical' }} value={draft.description || ''}
              onChange={e => set('description', e.target.value)} placeholder="Mô tả ngắn về shop của bạn" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Địa chỉ kho</div>
            <input style={inp} value={draft.address || ''} onChange={e => set('address', e.target.value)} placeholder="Địa chỉ lấy hàng" />
          </div>
        </div>
      </div>

      {/* Chính sách vận chuyển */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="truck" size={15} color="var(--primary)" /> Chính sách vận chuyển
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Thời gian xử lý đơn (ngày)</div>
            <input style={inp} type="number" min={0} max={7} value={draft.processing_days ?? 1}
              onChange={e => set('processing_days', +e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Phí ship mặc định (₫)</div>
            <input style={inp} type="number" step={5000} value={draft.shipping_fee_default ?? 25000}
              onChange={e => set('shipping_fee_default', +e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 8 }}>
          Phí ship hiển thị: {fmtVND(draft.shipping_fee_default ?? 25000)}₫ · Xử lý trong {draft.processing_days ?? 1} ngày làm việc
        </div>
      </div>

      {/* Chính sách đổi trả */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="refresh-cw" size={15} color="var(--primary)" /> Chính sách đổi trả
        </div>
        <textarea style={{ ...inp, height: 80, resize: 'vertical' }} value={draft.return_policy || ''}
          onChange={e => set('return_policy', e.target.value)}
          placeholder="Mô tả chính sách đổi trả của shop" />
      </div>

      {/* Thông báo */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="bell" size={15} color="var(--primary)" /> Thông báo email
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'notify_new_order', label: 'Đơn hàng mới', sub: 'Gửi email khi có đơn cần xác nhận' },
            { key: 'notify_cancelled', label: 'Đơn bị huỷ', sub: 'Gửi email khi khách huỷ đơn' },
          ].map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{item.sub}</div>
              </div>
              <button onClick={() => set(item.key, !draft[item.key])}
                style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative',
                  background: draft[item.key] ? 'var(--primary)' : 'var(--ink-200)', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', left: draft[item.key] ? 21 : 3 }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { MerchantSettingsSection });
