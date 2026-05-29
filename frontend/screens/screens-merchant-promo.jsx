// UIT Store — Merchant Promotions Section

const MerchantPromoSection = ({ merchantId, user }) => {
  const [vouchers, setVouchers] = React.useState([
    { id: 'v1', code: 'UITSTORE10', type: 'percent', value: 10, min_order: 200000, qty: 100, used: 23, expires: '2026-12-31', active: true },
    { id: 'v2', code: 'FREESHIP',   type: 'fixed',   value: 30000, min_order: 150000, qty: 500, used: 89, expires: '2026-09-30', active: true },
    { id: 'v3', code: 'SUMMER25',   type: 'percent', value: 25, min_order: 500000, qty: 50, used: 50, expires: '2026-06-30', active: false },
  ]);
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm]       = React.useState({ code:'', type:'percent', value:'', min_order:'', qty:'', expires:'' });

  const toggleVoucher = (id) => {
    setVouchers(vs => vs.map(v => v.id === id ? { ...v, active: !v.active } : v));
  };

  const addVoucher = () => {
    if (!form.code || !form.value) return;
    const newV = { id: 'v' + Date.now(), ...form, value: Number(form.value), min_order: Number(form.min_order || 0), qty: Number(form.qty || 100), used: 0, active: true };
    setVouchers(vs => [newV, ...vs]);
    setShowAdd(false);
    setForm({ code:'', type:'percent', value:'', min_order:'', qty:'', expires:'' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Khuyến mãi & Voucher</h2>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
          <Icon name="plus" size={13} /> Tạo voucher
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr 1fr 0.8fr', gap: 10, padding: '10px 16px', background: 'var(--ink-100)', fontSize: 11, fontWeight: 600, color: 'var(--ink-600)' }}>
          <span>Mã voucher</span><span>Loại giảm</span><span>Đơn tối thiểu</span><span>Đã dùng / Tổng</span><span>Hết hạn</span><span style={{ textAlign:'center' }}>Trạng thái</span><span></span>
        </div>

        {vouchers.map(v => (
          <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr 1fr 0.8fr', gap: 10, padding: '12px 16px', fontSize: 12, borderBottom: '1px solid var(--ink-100)', alignItems: 'center', background: v.active ? 'white' : '#FAFAFA' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: v.active ? 'var(--primary)' : 'var(--ink-400)', fontSize: 13 }}>
              {v.code}
            </div>
            <div style={{ color: 'var(--ink-700)' }}>
              {v.type === 'percent' ? `Giảm ${v.value}%` : `Giảm ${window.formatVND(v.value)}`}
            </div>
            <div style={{ color: 'var(--ink-600)' }}>{window.formatVND(v.min_order)}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{v.used} / {v.qty}</div>
              <div style={{ height: 3, background: 'var(--ink-100)', borderRadius: 2, marginTop: 4, width: 60 }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${Math.min((v.used/v.qty)*100, 100)}%`, background: v.used >= v.qty ? 'var(--price)' : 'var(--primary)' }} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>{v.expires}</div>
            <div style={{ textAlign: 'center' }}>
              {v.active
                ? <span className="badge badge-success" style={{ fontSize: 10 }}>● Đang chạy</span>
                : <span className="badge" style={{ fontSize: 10, background: 'var(--ink-100)', color: 'var(--ink-500)' }}>● Tắt</span>
              }
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => toggleVoucher(v.id)} style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4, background: 'white' }}>
                {v.active ? '⏸' : '▶'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Tạo voucher mới</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <input className="input" placeholder="Mã voucher (VD: SALE20)" value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--ink-200)' }}>
                  <option value="percent">Giảm %</option>
                  <option value="fixed">Giảm tiền cố định</option>
                </select>
                <input className="input" type="number" placeholder={form.type === 'percent' ? 'Giảm % (VD: 20)' : 'Giảm (VNĐ)'}
                  value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input" type="number" placeholder="Đơn tối thiểu (VNĐ)" value={form.min_order}
                  onChange={e => setForm({ ...form, min_order: e.target.value })} />
                <input className="input" type="number" placeholder="Số lượng (mã)" value={form.qty}
                  onChange={e => setForm({ ...form, qty: e.target.value })} />
              </div>
              <input className="input" type="date" value={form.expires} onChange={e => setForm({ ...form, expires: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--ink-200)' }} onClick={() => setShowAdd(false)}>Huỷ</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={addVoucher}>Tạo voucher</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { MerchantPromoSection });
