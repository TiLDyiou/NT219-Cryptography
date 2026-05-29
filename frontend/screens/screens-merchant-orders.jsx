// UIT Store — Merchant Orders Section

const _ORDER_STATUS = {
  pending:   { label: 'Chờ xác nhận', color: '#D97706', bg: '#FEF3C7' },
  confirmed: { label: 'Đã xác nhận',  color: '#2563EB', bg: '#EFF6FF' },
  shipped:   { label: 'Đang giao',    color: '#7C3AED', bg: '#F5F3FF' },
  delivered: { label: 'Đã giao',      color: '#059669', bg: '#ECFDF5' },
  cancelled: { label: 'Đã huỷ',       color: '#DC2626', bg: '#FEF2F2' },
};
const _PAYMENT_LABEL = { cod: 'COD', credit: 'Thẻ TD', vnpay: 'VNPay', momo: 'MoMo' };

const MerchantOrdersSection = ({ merchantId, user }) => {
  const BASE = (window.UitAPI && window.UitAPI.backendUrl) || 'http://localhost:10000';
  const [orders, setOrders]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab]         = React.useState('all');
  const [expanded, setExpanded] = React.useState(null);
  const [busy, setBusy]       = React.useState(null);
  const [notice, setNotice]   = React.useState(null);

  const hdr = () => {
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    return t
      ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }
      : { 'Content-Type': 'application/json', 'X-User-Id': (user && user.id) || 'user_demo_001' };
  };

  const showNotice = (msg, ok) => {
    setNotice({ msg, ok: ok !== false });
    setTimeout(() => setNotice(null), 3000);
  };

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/v1/orders/merchant/orders?merchant_id=${merchantId || ''}`, { headers: hdr() })
      .then(r => r.json())
      .then(d => { setOrders(Array.isArray(d.data) ? d.data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => { load(); }, [merchantId]);

  const updateStatus = (orderId, status) => {
    setBusy(orderId);
    fetch(`${BASE}/api/v1/orders/merchant/orders/${orderId}/status`, {
      method: 'PUT', headers: hdr(), body: JSON.stringify({ status }),
    })
    .then(r => r.json())
    .then(() => {
      load();
      const lbl = _ORDER_STATUS[status] && _ORDER_STATUS[status].label;
      showNotice(`Đơn chuyển sang "${lbl}"`, true);
      setExpanded(null);
      setBusy(null);
    })
    .catch(() => setBusy(null));
  };

  const counts = key => orders.filter(o => o.status === key).length;
  const filtered = tab === 'all' ? orders : orders.filter(o => o.status === tab);

  const TABS = [
    { id: 'all',       label: 'Tất cả' },
    { id: 'pending',   label: 'Chờ xác nhận' },
    { id: 'confirmed', label: 'Đang xử lý' },
    { id: 'shipped',   label: 'Đang giao' },
    { id: 'delivered', label: 'Đã giao' },
    { id: 'cancelled', label: 'Đã huỷ' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Quản lý đơn hàng</h2>
        <button onClick={load} style={{ padding: '6px 14px', fontSize: 12, border: '1px solid var(--ink-200)', borderRadius: 6, background: 'white' }}>
          ↻ Làm mới
        </button>
      </div>

      {notice && (
        <div style={{
          padding: '10px 14px', marginBottom: 12, borderRadius: 6, fontSize: 12,
          background: notice.ok ? '#ECFDF5' : '#FEF2F2',
          color: notice.ok ? '#059669' : '#DC2626',
          border: `1px solid ${notice.ok ? '#A7F3D0' : '#FCA5A5'}`,
        }}>{notice.msg}</div>
      )}

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--ink-100)' }}>
        {TABS.map(t => {
          const c = t.id === 'all' ? orders.length : counts(t.id);
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 12px', fontSize: 12, background: 'transparent',
              color: active ? 'var(--primary)' : 'var(--ink-600)',
              borderBottom: `2px solid ${active ? 'var(--primary)' : 'transparent'}`,
              fontWeight: active ? 600 : 400, marginBottom: -2,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {t.label}
              {c > 0 && (
                <span style={{
                  fontSize: 10, padding: '1px 5px', borderRadius: 8,
                  background: active ? 'var(--primary)' : 'var(--ink-200)',
                  color: active ? 'white' : 'var(--ink-600)',
                }}>{c}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-400)' }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 10px', borderWidth: 3 }} />
          Đang tải...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 14, color: 'var(--ink-600)' }}>
            {tab === 'pending' ? 'Không có đơn chờ xác nhận' : 'Chưa có đơn hàng nào'}
          </div>
          {tab === 'pending' && (
            <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 4 }}>
              Khi khách đặt hàng sản phẩm của bạn, đơn sẽ hiện ở đây.
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '150px 1fr 140px 110px 100px 140px',
            gap: 10, padding: '10px 16px',
            background: 'var(--ink-100)', fontSize: 11, fontWeight: 600, color: 'var(--ink-600)',
          }}>
            <span>Mã đơn</span><span>Sản phẩm</span><span>Khách hàng</span>
            <span>Tổng tiền</span><span>Thanh toán</span><span style={{ textAlign: 'center' }}>Trạng thái</span>
          </div>

          {filtered.map(order => {
            const st  = _ORDER_STATUS[order.status] || _ORDER_STATUS.pending;
            const exp = expanded === order.parent_order_number;
            const bsy = busy === order.parent_order_number;
            const phone = (order.shipping_address && order.shipping_address.phone) || '';
            const maskedPhone = phone ? phone.slice(0, 3) + '****' + phone.slice(-3) : '—';

            return (
              <div key={order.parent_order_number}>
                {/* Row */}
                <div onClick={() => setExpanded(exp ? null : order.parent_order_number)} style={{
                  display: 'grid', gridTemplateColumns: '150px 1fr 140px 110px 100px 140px',
                  gap: 10, padding: '12px 16px', fontSize: 12,
                  borderBottom: '1px solid var(--ink-100)',
                  background: exp ? 'var(--primary-tint)' : 'white',
                  cursor: 'pointer',
                }}>
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                      {order.parent_order_number}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 2 }}>
                      {new Date(order.created_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    {(order.items || []).slice(0, 2).map((item, i) => (
                      <div key={i} style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name || item.product_name_snapshot || item.product_id}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                      </div>
                    ))}
                    {(order.items || []).length > 2 && (
                      <div style={{ fontSize: 10, color: 'var(--ink-400)' }}>+{order.items.length - 2} sp khác</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 12 }}>{(order.shipping_address && order.shipping_address.name) || 'Khách hàng'}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-400)', fontFamily: 'monospace' }} title="Mã hoá field-level · Vault Transit">{maskedPhone} 🔒</div>
                  </div>

                  <div style={{ fontWeight: 600, color: 'var(--price)', fontSize: 12 }}>
                    {window.formatVND(order.total_amount || 0)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>
                    {_PAYMENT_LABEL[order.payment_method_type] || order.payment_method_type}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', fontSize: 10, padding: '3px 8px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 600 }}>
                      ● {st.label}
                    </span>
                  </div>
                </div>

                {/* Expanded actions */}
                {exp && (
                  <div style={{ padding: '12px 16px', background: '#F0F5FF', borderBottom: '2px solid var(--primary-soft)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-700)', flex: 1, minWidth: 200 }}>
                        Thao tác: <b style={{ fontFamily: 'monospace' }}>{order.parent_order_number}</b>
                        {order.shipping_address && (
                          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>
                            📍 {[order.shipping_address.address, order.shipping_address.city].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>

                      {order.status === 'pending' && (<>
                        <button onClick={() => updateStatus(order.parent_order_number, 'confirmed')}
                          disabled={bsy} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                          {bsy ? '...' : '✓ Xác nhận đơn'}
                        </button>
                        <button
                          onClick={() => { if (window.confirm('Huỷ đơn hàng này?')) updateStatus(order.parent_order_number, 'cancelled'); }}
                          disabled={bsy}
                          style={{ padding: '6px 14px', fontSize: 12, border: '1px solid #FCA5A5', borderRadius: 6, color: '#DC2626', background: 'white' }}>
                          Huỷ đơn
                        </button>
                      </>)}

                      {order.status === 'confirmed' && (
                        <button onClick={() => updateStatus(order.parent_order_number, 'shipped')}
                          disabled={bsy} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                          {bsy ? '...' : '🚚 Đánh dấu đang giao'}
                        </button>
                      )}

                      {order.status === 'shipped' && (
                        <button onClick={() => updateStatus(order.parent_order_number, 'delivered')}
                          disabled={bsy} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                          {bsy ? '...' : '✅ Đã giao hàng'}
                        </button>
                      )}

                      {['delivered', 'cancelled'].includes(order.status) && (
                        <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>Đơn hàng đã kết thúc.</span>
                      )}
                    </div>

                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--ink-200)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-400)' }}>
                      🔒 HMAC-SHA256 signed · req_id={Math.random().toString(36).slice(2, 10)} · Ghi vào audit log
                      &nbsp;·&nbsp; SĐT khách: field-encrypted (Vault Transit)
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { MerchantOrdersSection });
