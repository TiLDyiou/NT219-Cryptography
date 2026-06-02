// UIT Store — Merchant Analytics Section

const MerchantAnalyticsSection = ({ merchantId, user }) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [orders, setOrders]     = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [period, setPeriod]     = React.useState(30);

  const hdr = () => {
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    return t
      ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }
      : { 'Content-Type': 'application/json', 'X-User-Id': user && user.id };
  };

  const load = () => {
    setLoading(true);
    if (!BASE || !user) { setOrders([]); setProducts([]); setLoading(false); return; }
    const qp = merchantId ? `?merchant_id=${merchantId}` : '';
    Promise.all([
      fetch(`${BASE}/api/v1/orders/merchant/orders${qp}`, { headers: hdr() }).then(r => r.json()),
      fetch(`${BASE}/api/v1/catalog/merchant/products${qp}`, { headers: hdr() }).then(r => r.json()),
    ]).then(([o, p]) => {
      setOrders(Array.isArray(o.data) ? o.data : []);
      setProducts(Array.isArray(p.data) ? p.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  React.useEffect(() => { load(); }, [merchantId]);

  // Compute derived stats
  const totalRevenue = orders.filter(o => o.status === 'delivered')
    .reduce((s, o) => s + (o.total_amount || 0), 0);
  const pending   = orders.filter(o => o.status === 'pending_payment' || o.status === 'payment_processing').length;
  const confirmed = orders.filter(o => o.status === 'confirmed').length;
  const shipped   = orders.filter(o => o.status === 'shipped').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const cancelled = orders.filter(o => o.status === 'cancelled').length;

  // Top products by sold
  const productSales = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const pid = item.product_id;
      if (!productSales[pid]) productSales[pid] = { name: item.name || item.product_name_snapshot || pid, rev: 0, qty: 0 };
      if (o.status === 'delivered') {
        productSales[pid].rev += (item.unit_price || 0) * (item.quantity || 1);
        productSales[pid].qty += (item.quantity || 1);
      }
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.rev - a.rev).slice(0, 5);
  const maxRev = topProducts.length ? topProducts[0].rev : 1;

  // Order status distribution
  const statusDist = [
    { label: 'Chờ xác nhận', count: pending,   color: '#D97706' },
    { label: 'Đã xác nhận',  count: confirmed, color: '#2563EB' },
    { label: 'Đang giao',    count: shipped,   color: '#7C3AED' },
    { label: 'Đã giao',      count: delivered, color: '#059669' },
    { label: 'Đã huỷ',       count: cancelled, color: '#DC2626' },
  ].filter(s => s.count > 0);
  const totalOrders = orders.length || 1;

  // Revenue by day (last 7 days, from orders)
  const today = new Date();
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const revenueByDay = days7.map(d => {
    const dStr = d.toISOString().slice(0, 10);
    const rev = orders
      .filter(o => o.status === 'delivered' && (o.created_at || '').startsWith(dStr))
      .reduce((s, o) => s + (o.total_amount || 0), 0);
    return { label: `${d.getDate()}/${d.getMonth()+1}`, rev };
  });
  const maxDayRev = Math.max(...revenueByDay.map(d => d.rev), 1);

  const cancelRate = orders.length ? ((cancelled / orders.length) * 100).toFixed(1) : '0.0';
  const deliverRate = orders.length ? ((delivered / orders.length) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Phân tích bán hàng</h2>
        <button onClick={load} style={{ padding: '6px 14px', fontSize: 12, border: '1px solid var(--ink-200)', borderRadius: 6, background: 'white' }}>↻ Làm mới</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-400)' }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 10px', borderWidth: 3 }} />Đang tải...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { l: 'Tổng đơn hàng',    v: orders.length,               c: 'var(--primary)' },
              { l: 'Doanh thu đã giao', v: window.formatVND(totalRevenue), c: 'var(--success)' },
              { l: 'Tỉ lệ giao thành công', v: deliverRate + '%',      c: 'var(--success)' },
              { l: 'Tỉ lệ huỷ đơn',   v: cancelRate + '%',            c: cancelled > 0 ? 'var(--price)' : 'var(--ink-700)' },
            ].map(s => (
              <div key={s.l} className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-600)', marginBottom: 6 }}>{s.l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Revenue chart + status distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            {/* Bar chart */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Doanh thu 7 ngày gần nhất</div>
              {revenueByDay.every(d => d.rev === 0) ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--ink-400)', fontSize: 12 }}>
                  Chưa có đơn hàng đã giao. Doanh thu sẽ hiển thị khi có đơn delivered.
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
                  {revenueByDay.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      {d.rev > 0 && (
                        <div style={{ fontSize: 9, color: 'var(--ink-500)', textAlign: 'center', lineHeight: 1.2 }}>
                          {(d.rev / 1000).toFixed(0)}k
                        </div>
                      )}
                      <div style={{
                        width: '100%', borderRadius: '3px 3px 0 0',
                        height: `${Math.max((d.rev / maxDayRev) * 110, d.rev > 0 ? 4 : 0)}px`,
                        background: d.rev > 0 ? 'var(--primary)' : 'var(--ink-200)',
                        minHeight: d.rev > 0 ? 4 : 2,
                        transition: 'height 0.3s',
                      }} />
                      <div style={{ fontSize: 10, color: 'var(--ink-500)', whiteSpace: 'nowrap' }}>{d.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order status distribution */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Phân bố trạng thái</div>
              {statusDist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-400)', fontSize: 12 }}>Chưa có đơn</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {statusDist.map(s => (
                    <div key={s.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: 'var(--ink-600)' }}>{s.label}</span>
                        <span style={{ fontWeight: 600 }}>{s.count} ({((s.count / totalOrders) * 100).toFixed(0)}%)</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--ink-100)', borderRadius: 3 }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${(s.count / totalOrders) * 100}%`,
                          background: s.color,
                          transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top products */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Top sản phẩm theo doanh thu (đơn delivered)</div>
            {topProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-400)', fontSize: 12 }}>
                Dữ liệu sẽ xuất hiện sau khi có đơn hàng delivered.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topProducts.map((p, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                        {i + 1}. {p.name}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--success)', marginLeft: 10, whiteSpace: 'nowrap' }}>
                        {window.formatVND(p.rev)} · {p.qty} sp
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--ink-100)', borderRadius: 3 }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${(p.rev / maxRev) * 100}%`, background: 'var(--primary)', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--ink-400)', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', padding: '4px 0' }}>
            Dữ liệu tổng hợp từ {orders.length} đơn hàng · {products.length} sản phẩm từ backend
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { MerchantAnalyticsSection });
