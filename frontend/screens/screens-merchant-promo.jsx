// UIT Store — Merchant Promotions Section

const MerchantPromoSection = ({ merchantId, user }) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [vouchers, setVouchers] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [busy, setBusy]         = React.useState(null);
  const [notice, setNotice]     = React.useState(null);
  const [form, setForm]         = React.useState({
    code: '', type: 'percent', value: 10, min_order: 200000, quantity: 100,
    expires_at: '2026-12-31',
  });

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

  const load = () => {
    if (!BASE) { setLoading(false); return; }
    setLoading(true);
    fetch(`${BASE}/api/v1/promo/merchant/vouchers?merchant_id=${merchantId}`, { headers: hdr() })
      .then(r => r.json())
      .then(d => { setVouchers((d && d.data) || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  React.useEffect(load, [merchantId]);

  const handleCreate = () => {
    if (!form.code.trim()) { showMsg('Nhập mã voucher', false); return; }
    setBusy('create');
    const body = { ...form, merchant_id: merchantId, expires_at: form.expires_at + 'T23:59:59Z' };
    fetch(`${BASE}/api/v1/promo/merchant/vouchers`, { method: 'POST', headers: hdr(), body: JSON.stringify(body) })
      .then(r => r.json())
      .then(d => {
        if (d && d.data) {
          setVouchers(vs => [d.data, ...vs]);
          setShowForm(false);
          setForm({ code: '', type: 'percent', value: 10, min_order: 200000, quantity: 100, expires_at: '2026-12-31' });
          showMsg('Tạo voucher thành công');
        } else {
          showMsg((d.error && d.error.message) || 'Lỗi tạo voucher', false);
        }
      })
      .catch(() => showMsg('Lỗi kết nối', false))
      .finally(() => setBusy(null));
  };

  const handleToggle = (v) => {
    setBusy(v.id);
    fetch(`${BASE}/api/v1/promo/merchant/vouchers/${v.id}/toggle`,
      { method: 'PUT', headers: hdr(), body: JSON.stringify({ merchant_id: merchantId }) })
      .then(r => r.json())
      .then(d => {
        if (d && d.data) setVouchers(vs => vs.map(x => x.id === v.id ? d.data : x));
      })
      .catch(() => showMsg('Lỗi kết nối', false))
      .finally(() => setBusy(null));
  };

  const typeLabel = { percent: '% giảm', fixed: 'Giảm cố định', shipping: 'Free ship' };
  const fmtVND = (n) => new Intl.NumberFormat('vi-VN').format(n) + '₫';
  const fmtExp = (s) => new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const isExpired = (s) => new Date(s) < new Date();

  const inp = { padding: '8px 10px', border: '1px solid var(--ink-200)', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Khuyến mãi & Voucher</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary" style={{ padding: '7px 16px', fontSize: 13 }}>
          <Icon name="plus" size={14} /> Tạo voucher
        </button>
      </div>

      {notice && (
        <div style={{ padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, fontWeight: 500,
          background: notice.ok ? '#ECFDF5' : '#FEF2F2', color: notice.ok ? '#065F46' : '#991B1B',
          border: `1px solid ${notice.ok ? '#6EE7B7' : '#FECACA'}` }}>
          {notice.msg}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Tạo voucher mới</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Mã voucher *</div>
              <input style={inp} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="VD: SUMMER20" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Loại giảm giá</div>
              <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="percent">Phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (₫)</option>
                <option value="shipping">Miễn phí vận chuyển</option>
              </select>
            </div>
            {form.type !== 'shipping' && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>
                  Giá trị giảm {form.type === 'percent' ? '(%)' : '(₫)'}
                </div>
                <input style={inp} type="number" value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: +e.target.value }))} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Đơn tối thiểu (₫)</div>
              <input style={inp} type="number" value={form.min_order}
                onChange={e => setForm(f => ({ ...f, min_order: +e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Số lượng</div>
              <input style={inp} type="number" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Hết hạn</div>
              <input style={inp} type="date" value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={busy === 'create'} className="btn btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}>
              {busy === 'create' ? 'Đang tạo…' : 'Tạo voucher'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn btn-outline" style={{ padding: '7px 14px', fontSize: 13 }}>Huỷ</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-400)' }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 10px' }} />
          Đang tải...
        </div>
      ) : vouchers.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-500)' }}>
          <Icon name="tag" size={36} color="var(--ink-300)" />
          <div style={{ marginTop: 10 }}>Chưa có voucher nào</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vouchers.map(v => {
            const expired = isExpired(v.expires_at);
            const pct = v.quantity > 0 ? Math.round(v.used / v.quantity * 100) : 100;
            return (
              <div key={v.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14,
                opacity: (!v.active || expired) ? 0.6 : 1 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--primary-tint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="tag" size={22} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>{v.code}</span>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
                      background: v.type === 'percent' ? '#EFF6FF' : v.type === 'shipping' ? '#ECFDF5' : '#FFF7ED',
                      color: v.type === 'percent' ? '#2563EB' : v.type === 'shipping' ? '#059669' : '#EA580C' }}>
                      {v.type === 'percent' ? `-${v.value}%` : v.type === 'fixed' ? `-${fmtVND(v.value)}` : 'Free ship'}
                    </span>
                    {expired && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontWeight: 600 }}>Hết hạn</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 3 }}>
                    Đơn tối thiểu {fmtVND(v.min_order)} · Hết hạn {fmtExp(v.expires_at)}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--ink-100)', borderRadius: 2 }}>
                      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 2,
                        background: pct >= 100 ? '#EF4444' : pct > 70 ? '#F59E0B' : 'var(--primary)' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-500)', whiteSpace: 'nowrap' }}>{v.used}/{v.quantity} đã dùng</span>
                  </div>
                </div>
                <button onClick={() => handleToggle(v)} disabled={busy === v.id}
                  style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: v.active ? '#FEF2F2' : '#ECFDF5', color: v.active ? '#DC2626' : '#059669' }}>
                  {busy === v.id ? '…' : v.active ? 'Tắt' : 'Bật'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { MerchantPromoSection });
