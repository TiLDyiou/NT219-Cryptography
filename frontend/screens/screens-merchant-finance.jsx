// UIT Store — Merchant Finance Section

const MerchantFinanceSection = ({ merchantId, user }) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [balance, setBalance]   = React.useState(null);
  const [txns, setTxns]         = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [showWithdraw, setShowWithdraw] = React.useState(false);
  const [wAmount, setWAmount]   = React.useState('');
  const [notice, setNotice]     = React.useState(null);

  const hdr = () => {
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    return t
      ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }
      : { 'Content-Type': 'application/json', 'X-User-Id': user && user.id };
  };

  const load = () => {
    setLoading(true);
    if (!BASE || !user) { setBalance(null); setTxns([]); setLoading(false); return; }
    const qp = merchantId ? `?merchant_id=${merchantId}` : '';
    Promise.all([
      fetch(`${BASE}/api/v1/finance/merchant/balance${qp}`, { headers: hdr() }).then(r => r.json()),
      fetch(`${BASE}/api/v1/finance/merchant/transactions${qp}`, { headers: hdr() }).then(r => r.json()),
    ]).then(([b, t]) => {
      setBalance(b.data || null);
      setTxns(Array.isArray(t.data) ? t.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  React.useEffect(() => { load(); }, [merchantId]);

  const doWithdraw = () => {
    const amt = Number(wAmount);
    if (!amt || amt <= 0) return;
    fetch(`${BASE}/api/v1/finance/merchant/withdraw`, {
      method: 'POST', headers: hdr(), body: JSON.stringify({ amount: amt, merchant_id: merchantId }),
    })
    .then(r => r.json())
    .then(() => {
      setNotice({ msg: `Yêu cầu rút ${window.formatVND(amt)} đã gửi. Xử lý 1-3 ngày làm việc.`, ok: true });
      setShowWithdraw(false); setWAmount(''); load();
      setTimeout(() => setNotice(null), 5000);
    });
  };

  const statusColor = s => ({ delivered: 'var(--success)', pending: 'var(--warn)', cancelled: '#9CA3AF' }[s] || 'var(--ink-600)');
  const statusLabel = s => ({ delivered: 'Đã nhận tiền', pending: 'Đang xử lý', shipped: 'Đang giao', confirmed: 'Chờ giao', cancelled: 'Đã huỷ' }[s] || s);

  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Tài chính · Thanh toán</h2>

      {notice && (
        <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 6, fontSize: 12, background: notice.ok ? '#ECFDF5' : '#FEF2F2', color: notice.ok ? '#059669' : '#DC2626', border: `1px solid ${notice.ok ? '#A7F3D0' : '#FCA5A5'}` }}>
          {notice.msg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-400)' }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 10px', borderWidth: 3 }} />Đang tải...
        </div>
      ) : (
        <>
          {/* Balance cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
            {[
              { label: 'Có thể rút', value: balance ? window.formatVND(balance.available) : '—', color: 'var(--success)', note: 'Đã định toán' },
              { label: 'Đang chờ',   value: balance ? window.formatVND(balance.pending)   : '—', color: 'var(--warn)',    note: 'Chờ xác nhận giao' },
              { label: 'Tổng doanh thu', value: balance ? window.formatVND(balance.total) : '—', color: 'var(--primary)', note: 'Sau phí 5% platform' },
            ].map(c => (
              <div key={c.label} className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>{c.note}</div>
              </div>
            ))}
          </div>

          {/* Bank account + withdraw */}
          <div className="card" style={{ padding: 16, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Icon name="wallet" size={24} color="var(--primary)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Tài khoản ngân hàng</div>
              <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>
                {balance && balance.bank_account ? (
                  <span>
                    {balance.bank_account.bank} · <b style={{ fontFamily: 'monospace' }}>{balance.bank_account.masked}</b>
                    <span className="badge" style={{ marginLeft: 8, fontSize: 10, background: '#EFF6FF', color: '#2563EB' }}>
                      {balance.bank_account.encryption}
                    </span>
                  </span>
                ) : '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 2 }}>
                Số tài khoản lưu mã hoá AES-256-GCM trong DB · Chỉ hiển thị dạng masked
              </div>
            </div>
            <button onClick={() => setShowWithdraw(true)} disabled={!balance} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              Yêu cầu rút tiền
            </button>
          </div>

          {/* Transactions */}
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-100)', fontWeight: 600, fontSize: 14 }}>
              Lịch sử giao dịch
            </div>
            {txns.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)', fontSize: 13 }}>
                Chưa có giao dịch. Khi đơn hàng được giao, tiền sẽ hiện ở đây.
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 1fr',
                  gap: 10, padding: '8px 16px', background: 'var(--ink-100)', fontSize: 11, fontWeight: 600, color: 'var(--ink-600)',
                }}>
                  <span>Ngày</span><span>Mô tả</span><span>Doanh thu</span><span>Phí (5%)</span><span>Thực nhận</span><span>Trạng thái</span>
                </div>
                {txns.map((t, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 1fr',
                    gap: 10, padding: '10px 16px', fontSize: 12, borderBottom: '1px solid var(--ink-100)',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                      {t.date ? new Date(t.date).toLocaleDateString('vi-VN') : '—'}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{t.desc}</span>
                    <span style={{ color: 'var(--ink-700)' }}>{window.formatVND(t.amount)}</span>
                    <span style={{ color: 'var(--warn)' }}>-{window.formatVND(t.fee)}</span>
                    <span style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--success)' : 'var(--ink-600)' }}>
                      {window.formatVND(t.net)}
                    </span>
                    <span style={{ fontSize: 11, color: statusColor(t.status) }}>{statusLabel(t.status)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* Withdraw modal */}
      {showWithdraw && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90 }}
          onClick={() => setShowWithdraw(false)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 360, width: '90%', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Yêu cầu rút tiền</div>
            <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 16 }}>
              Số dư có thể rút: <b style={{ color: 'var(--success)' }}>{window.formatVND(balance ? balance.available : 0)}</b>
            </div>
            <input className="input" type="number" placeholder="Số tiền cần rút (VNĐ)" value={wAmount}
              onChange={e => setWAmount(e.target.value)} style={{ marginBottom: 14 }} />
            <div style={{ padding: '10px 12px', background: '#EFF6FF', borderRadius: 6, fontSize: 11, color: '#2563EB', marginBottom: 14 }}>
              Chuyển đến: VietcomBank · <b style={{ fontFamily: 'monospace' }}>{balance && balance.bank_account ? balance.bank_account.masked : '—'}</b>
              <br/>Thời gian: 1-3 ngày làm việc
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--ink-200)' }} onClick={() => setShowWithdraw(false)}>Huỷ</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={doWithdraw}>Xác nhận rút tiền</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { MerchantFinanceSection });
