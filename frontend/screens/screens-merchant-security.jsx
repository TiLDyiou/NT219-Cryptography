// UIT Store — Merchant Security Section (NT219 focal point)

const MerchantSecuritySection = ({ merchantId, user }) => {
  const BASE = (window.UitAPI && window.UitAPI.backendUrl) || 'http://localhost:10000';
  const [keyData, setKeyData]   = React.useState(null);
  const [auditLog, setAuditLog] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [rotating, setRotating] = React.useState(false);
  const [newKey, setNewKey]     = React.useState(null);
  const [auditFilter, setAuditFilter] = React.useState('all');

  const hdr = () => {
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    return t
      ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }
      : { 'Content-Type': 'application/json', 'X-User-Id': (user && user.id) || 'user_demo_001' };
  };

  const load = () => {
    setLoading(true);
    const qp = merchantId ? `?merchant_id=${merchantId}` : '';
    Promise.all([
      fetch(`${BASE}/api/v1/security/merchant/api-keys${qp}`, { headers: hdr() }).then(r => r.json()),
      fetch(`${BASE}/api/v1/security/merchant/audit-log${qp}`, { headers: hdr() }).then(r => r.json()),
    ]).then(([k, a]) => {
      setKeyData(k.data || null);
      setAuditLog(Array.isArray(a.data) ? a.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  React.useEffect(() => { load(); }, [merchantId]);

  const rotateKey = () => {
    if (!window.confirm('Rotate API key? Key cũ sẽ bị vô hiệu ngay lập tức.')) return;
    setRotating(true);
    fetch(`${BASE}/api/v1/security/merchant/api-keys/rotate`, {
      method: 'POST', headers: hdr(), body: JSON.stringify({ merchant_id: merchantId }),
    })
    .then(r => r.json())
    .then(d => {
      setNewKey(d.data && d.data.new_key_full);
      setRotating(false);
      load();
    })
    .catch(() => setRotating(false));
  };

  const auditTypes = ['all', 'login', 'product_update', 'order_status_change', 'api_key_rotate', 'new_order'];
  const filteredLog = auditFilter === 'all' ? auditLog : auditLog.filter(e => e.action === auditFilter);

  const daysUntilExpiry = (expStr) => {
    if (!expStr) return null;
    const diff = new Date(expStr) - new Date();
    return Math.round(diff / 86400000);
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Bảo mật shop — NT219 Demo</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-400)' }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 10px', borderWidth: 3 }} />Đang tải...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* MFA Status */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="fingerprint" size={18} color="var(--primary)" /> Trạng thái MFA
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { method: 'WebAuthn / Passkey', active: true,  badge: 'Đang dùng', color: 'var(--success)', desc: 'Touch ID · MacBook Pro · FIDO2' },
                { method: 'TOTP (Authenticator)', active: false, badge: 'Sẵn sàng', color: 'var(--warn)',    desc: 'Google Authenticator · RFC 6238' },
                { method: 'SMS OTP',              active: false, badge: 'Kém an toàn', color: '#9CA3AF',     desc: 'Dễ bị SIM-swap · SS7 attack' },
              ].map(m => (
                <div key={m.method} style={{
                  flex: 1, minWidth: 180, padding: 12, borderRadius: 8,
                  border: `1.5px solid ${m.active ? 'var(--success)' : 'var(--ink-200)'}`,
                  background: m.active ? '#F0FDF4' : 'white',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{m.method}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 8 }}>{m.desc}</div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: m.active ? 'var(--success)' : m.color === '#9CA3AF' ? 'var(--ink-100)' : '#FEF3C7', color: m.active ? 'white' : m.color, fontWeight: 600 }}>
                    {m.badge}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-500)', fontFamily: 'JetBrains Mono, monospace' }}>
              Keycloak realm policy: tài khoản merchant bắt buộc bật MFA · WebAuthn &gt; TOTP &gt; SMS
            </div>
          </div>

          {/* API Key Management */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="key" size={18} color="var(--primary)" /> API Key Management
            </div>

            {newKey && (
              <div style={{ padding: '12px 16px', marginBottom: 14, background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#92400E', marginBottom: 6 }}>⚠ Key mới — Chỉ hiển thị một lần!</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, background: 'white', padding: '6px 10px', borderRadius: 4, letterSpacing: '0.05em', wordBreak: 'break-all' }}>
                  {newKey}
                </div>
                <div style={{ fontSize: 11, color: '#92400E', marginTop: 6 }}>Sao chép và lưu vào secret manager ngay. Sau khi đóng hộp này key sẽ bị che.</div>
                <button onClick={() => setNewKey(null)} style={{ marginTop: 8, padding: '4px 12px', fontSize: 11, border: '1px solid #FCD34D', borderRadius: 4, background: 'white', color: '#92400E' }}>
                  Đã lưu, đóng
                </button>
              </div>
            )}

            {keyData && keyData.current ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {[
                    { l: 'Key ID',           v: keyData.current.id },
                    { l: 'Version',          v: `v${keyData.current.version}` },
                    { l: 'Tạo lúc',          v: keyData.current.created_at ? new Date(keyData.current.created_at).toLocaleDateString('vi-VN') : '—' },
                    { l: 'Hết hạn',          v: (() => { const d = daysUntilExpiry(keyData.current.expires_at); return d != null ? `${d >= 0 ? d : 0} ngày nữa` : '—'; })() },
                  ].map(i => (
                    <div key={i.l} style={{ padding: '8px 12px', background: 'var(--ink-100)', borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-500)', marginBottom: 2 }}>{i.l}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{i.v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '10px 14px', background: 'var(--ink-100)', borderRadius: 6, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 2 }}>API Key hiện tại</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600 }}>
                      {keyData.current.masked || 'sk_live_••••••••••••••••••••••••'}
                    </div>
                  </div>
                  {(() => {
                    const d = daysUntilExpiry(keyData.current.expires_at);
                    if (d != null && d < 14)
                      return <span className="badge" style={{ fontSize: 10, background: '#FEF3C7', color: '#D97706' }}>⚠ Sắp hết hạn</span>;
                    return <span className="badge badge-success" style={{ fontSize: 10 }}>● Valid</span>;
                  })()}
                </div>

                <button onClick={rotateKey} disabled={rotating}
                  className="btn btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>
                  {rotating ? 'Đang rotate...' : '🔄 Rotate API Key'}
                </button>
                <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--ink-500)' }}>
                  Khuyến nghị rotate mỗi 90 ngày · Auto-rotation lúc hết hạn
                </span>

                {keyData.history && keyData.history.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--ink-600)' }}>Lịch sử rotation</div>
                    {keyData.history.slice(0, 3).map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 10px', background: 'var(--ink-100)', borderRadius: 4, marginBottom: 4, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-600)' }}>
                        <span>v{h.version}</span>
                        <span>·</span>
                        <span>{h.created_at ? new Date(h.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                        <span>·</span>
                        <span style={{ color: '#9CA3AF' }}>revoked</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--ink-500)', fontSize: 13 }}>Chưa có API key. <button onClick={load} style={{ color: 'var(--primary)' }}>Tải lại</button></div>
            )}
          </div>

          {/* mTLS Certificate */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="shield-check" size={18} color="var(--primary)" /> mTLS Client Certificate
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[
                { l: 'Subject (CN)',   v: `merchant.${merchantId || 'm_techworld'}.uit.store` },
                { l: 'Serial Number', v: '4A:F3:12:CC:09:E8:B1:7D' },
                { l: 'Issued by',     v: 'UIT-CA-Intermediate-2026' },
                { l: 'Hết hạn',       v: '2027-06-01 (366 ngày còn lại)' },
                { l: 'Key algorithm', v: 'ECDSA P-256' },
                { l: 'Signature',     v: 'SHA256withECDSA' },
              ].map(i => (
                <div key={i.l} style={{ padding: '8px 10px', background: 'var(--ink-100)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-500)', marginBottom: 2 }}>{i.l}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{i.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-success" style={{ fontSize: 11 }}>● Valid · TLS 1.3</span>
              <button style={{ padding: '6px 14px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 6, background: 'white' }}>
                ⬇ Download cert bundle
              </button>
              <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>· Dùng cho Envoy mTLS handshake</span>
            </div>
          </div>

          {/* Audit Log */}
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-100)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                <Icon name="shield-check" size={14} color="var(--primary)" /> Audit Log — Append-only
              </div>
              <select value={auditFilter} onChange={e => setAuditFilter(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4 }}>
                {auditTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={load} style={{ padding: '4px 10px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4, background: 'white' }}>↻</button>
            </div>

            {filteredLog.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-500)', fontSize: 12 }}>Không có log</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1.2fr 2fr 1fr', gap: 10, padding: '8px 16px', background: 'var(--ink-100)', fontSize: 10, fontWeight: 600, color: 'var(--ink-600)' }}>
                  <span>Thời gian</span><span>Action</span><span>Resource / Chi tiết</span><span>Signature</span>
                </div>
                {filteredLog.slice(0, 30).map(e => (
                  <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '160px 1.2fr 2fr 1fr', gap: 10, padding: '8px 16px', fontSize: 11, borderBottom: '1px solid var(--ink-100)', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                        {e.timestamp ? new Date(e.timestamp).toLocaleString('vi-VN', { day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit' }) : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 1 }}>{e.ip}</div>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--primary)' }}>{e.action}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-600)', wordBreak: 'break-word' }}>{e.resource}</div>
                    <div>
                      {e.sig_ok ? (
                        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          ✓ {e.signature ? e.signature.slice(0, 24) + '…' : 'ok'}
                        </span>
                      ) : (
                        <span style={{ fontSize: 9, color: '#DC2626' }}>✗ INVALID</span>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ padding: '8px 16px', fontSize: 10, color: 'var(--ink-400)', fontFamily: 'JetBrains Mono, monospace', borderTop: '1px solid var(--ink-100)' }}>
                  Audit log được ký HMAC-SHA256 · immutable · dùng để detect tampering (NT219 integrity demo)
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { MerchantSecuritySection });
