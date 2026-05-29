// UIT Store — Merchant Settings Section

const MerchantSettingsSection = ({ merchantId, user }) => {
  const merchant = (window.MERCHANTS || {})[merchantId] || {};
  const [info, setInfo]    = React.useState({
    name:        merchant.name || '',
    description: 'Cửa hàng công nghệ chính hãng, uy tín hàng đầu Việt Nam.',
    address:     'Tầng 3, Tòa nhà UIT, Khu Công nghệ cao, TP.HCM',
    phone:       '0909 xxx xxx',
    email:       'merchant@uitstore.vn',
  });
  const [shipping, setShipping] = React.useState({ free_threshold: 300000, express_fee: 45000, std_fee: 22000, processing_days: 1 });
  const [returns, setReturns]   = React.useState({ days: 7, policy: 'Sản phẩm lỗi được đổi trả trong 7 ngày từ ngày nhận.' });
  const [notify, setNotify]     = React.useState({ new_order: true, cancelled: true, low_stock: false });
  const [saved, setSaved]       = React.useState(null);

  const save = (section) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Cài đặt shop</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Shop info */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Thông tin cửa hàng</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[
              { l: 'Tên shop', k: 'name', ph: 'Tên cửa hàng' },
              { l: 'Email',   k: 'email', ph: 'Email liên hệ' },
              { l: 'Số điện thoại', k: 'phone', ph: 'SĐT liên hệ' },
              { l: 'Địa chỉ kho hàng', k: 'address', ph: 'Địa chỉ kho' },
            ].map(f => (
              <div key={f.k}>
                <label style={{ fontSize: 11, color: 'var(--ink-600)', marginBottom: 4, display: 'block' }}>{f.l}</label>
                <input className="input" value={info[f.k]} placeholder={f.ph}
                  onChange={e => setInfo({ ...info, [f.k]: e.target.value })} style={{ fontSize: 13 }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--ink-600)', marginBottom: 4, display: 'block' }}>Mô tả shop</label>
            <textarea className="input" rows={2} value={info.description}
              onChange={e => setInfo({ ...info, description: e.target.value })}
              style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => save('info')} className="btn btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}>
              Lưu thông tin
            </button>
            {saved === 'info' && <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ Đã lưu</span>}
          </div>
        </div>

        {/* Shipping policy */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Chính sách vận chuyển</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            {[
              { l: 'Miễn phí từ (VNĐ)', k: 'free_threshold' },
              { l: 'Phí giao nhanh',     k: 'express_fee' },
              { l: 'Phí giao thường',    k: 'std_fee' },
              { l: 'Thời gian xử lý (ngày)', k: 'processing_days' },
            ].map(f => (
              <div key={f.k}>
                <label style={{ fontSize: 11, color: 'var(--ink-600)', marginBottom: 4, display: 'block' }}>{f.l}</label>
                <input className="input" type="number" value={shipping[f.k]}
                  onChange={e => setShipping({ ...shipping, [f.k]: Number(e.target.value) })} style={{ fontSize: 13 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => save('shipping')} className="btn btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}>Lưu</button>
            {saved === 'shipping' && <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ Đã lưu</span>}
          </div>
        </div>

        {/* Return policy */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Chính sách đổi trả</div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginBottom: 14, alignItems: 'start' }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink-600)', marginBottom: 4, display: 'block' }}>Số ngày đổi trả</label>
              <input className="input" type="number" value={returns.days}
                onChange={e => setReturns({ ...returns, days: Number(e.target.value) })} style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink-600)', marginBottom: 4, display: 'block' }}>Nội dung chính sách</label>
              <textarea className="input" rows={2} value={returns.policy}
                onChange={e => setReturns({ ...returns, policy: e.target.value })}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => save('returns')} className="btn btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}>Lưu</button>
            {saved === 'returns' && <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ Đã lưu</span>}
          </div>
        </div>

        {/* Notifications */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Thông báo</div>
          {[
            { k: 'new_order',  l: 'Email khi có đơn hàng mới' },
            { k: 'cancelled',  l: 'Email khi đơn hàng bị huỷ' },
            { k: 'low_stock',  l: 'Cảnh báo khi sản phẩm sắp hết hàng (< 10)' },
          ].map(n => (
            <label key={n.k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={notify[n.k]} onChange={e => setNotify({ ...notify, [n.k]: e.target.checked })} />
              {n.l}
            </label>
          ))}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <button onClick={() => save('notify')} className="btn btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}>Lưu</button>
            {saved === 'notify' && <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ Đã lưu</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { MerchantSettingsSection });
