// UIT Store — Login (with MFA) and Merchant Dashboard

// ─── Login Screen with MFA ──────────────────────────────────────────
const LoginScreen = ({ onLogin, onNav }) => {
  const [step, setStep] = React.useState('credentials'); // credentials, mfa-pick, mfa-totp, mfa-webauthn
  const [email, setEmail] = React.useState('an.nguyen@uit.edu.vn');
  const [password, setPassword] = React.useState('••••••••••');
  const [totp, setTotp] = React.useState(['', '', '', '', '', '']);
  const [webAuthnState, setWebAuthnState] = React.useState('idle');

  const next = (target) => () => setStep(target);

  const setDigit = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...totp]; next[i] = v;
    setTotp(next);
    if (v && i < 5) {
      const el = document.getElementById(`totp-${i+1}`);
      if (el) el.focus();
    }
    if (next.every(d => d) && i === 5) {
      setTimeout(() => onLogin({ name: 'Nguyễn Văn An', initial: 'A', email }), 400);
    }
  };

  const tryWebAuthn = () => {
    setWebAuthnState('prompting');
    setTimeout(() => setWebAuthnState('signing'), 1200);
    setTimeout(() => setWebAuthnState('success'), 2400);
    setTimeout(() => onLogin({ name: 'Nguyễn Văn An', initial: 'A', email }), 3000);
  };

  return (
    <div className="login-container">
      <div className="login-grid">
        {/* Left visual */}
        <div className="login-visual">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)', fontWeight: 800, fontSize: 16,
              }}>UIT</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>UIT Store</div>
            </div>
            <h2 style={{ fontSize: 26, lineHeight: 1.25, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
              Đăng nhập an toàn<br/>với OAuth2 + PKCE
            </h2>
            <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6, maxWidth: 340 }}>
              UIT Store áp dụng các tiêu chuẩn xác thực hiện đại nhất:
              <b> Authorization Code + PKCE</b>, refresh-token rotation,
              và bắt buộc MFA cho tài khoản nhạy cảm.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: 'shield-check', t: 'OAuth2 / OpenID Connect', s: 'Token JWT ngắn hạn · refresh rotation' },
              { icon: 'fingerprint', t: 'WebAuthn / FIDO2', s: 'Đăng nhập không mật khẩu — passkey' },
              { icon: 'key', t: 'TOTP / Authenticator App', s: 'RFC 6238 · OTP 30 giây' },
              { icon: 'lock', t: 'Argon2id password hashing', s: 'Resistant chống brute-force GPU' },
            ].map(f => (
              <div key={f.t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={f.icon} size={16} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{f.t}</div>
                  <div style={{ opacity: 0.85, fontSize: 11 }}>{f.s}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Decorative */}
          <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', right: 30, bottom: -40, width: 100, height: 100, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.2)' }} />
        </div>

        {/* Right form */}
        <div style={{ padding: 36, display: 'flex', flexDirection: 'column' }}>
          {step === 'credentials' && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Chào mừng trở lại</div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 24 }}>
                Đăng nhập tài khoản UIT Store của bạn
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Email hoặc Số điện thoại</label>
                <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Mật khẩu</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                  <Icon name="eye" size={16} color="var(--ink-400)" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" /> Ghi nhớ thiết bị này
                </label>
                <a style={{ color: 'var(--primary)' }}>Quên mật khẩu?</a>
              </div>

              <button onClick={next('mfa-pick')} className="btn btn-primary" style={{ width: '100%', padding: 12 }}>
                Đăng nhập
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0', color: 'var(--ink-400)', fontSize: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--ink-200)' }} />
                Hoặc
                <div style={{ flex: 1, height: 1, background: 'var(--ink-200)' }} />
              </div>

              <button onClick={tryWebAuthn} style={{
                width: '100%', padding: 11, border: '1px solid var(--ink-200)',
                borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, fontSize: 13, background: 'white',
              }}>
                <Icon name="fingerprint" size={16} color="var(--primary)" />
                Đăng nhập bằng Passkey (WebAuthn)
              </button>

              <div style={{ marginTop: 14, padding: 12, background: 'var(--ink-100)', borderRadius: 6, fontSize: 11, color: 'var(--ink-600)', lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'start' }}>
                <Icon name="lock" size={14} color="var(--success)" />
                <span>Mật khẩu được hash với <b>Argon2id</b> + per-user salt + server-side pepper. UIT Store không bao giờ lưu mật khẩu dưới dạng plain.</span>
              </div>

              <div style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-600)', textAlign: 'center' }}>
                Chưa có tài khoản? <a style={{ color: 'var(--primary)', fontWeight: 500 }}>Đăng ký ngay</a>
              </div>
            </div>
          )}

          {step === 'mfa-pick' && (
            <div>
              <button onClick={next('credentials')} style={{ color: 'var(--ink-500)', fontSize: 12, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="arrow-left" size={12} /> Quay lại
              </button>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Xác thực 2 lớp (MFA)</div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 24 }}>
                Chọn phương thức xác thực để hoàn tất đăng nhập
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={next('mfa-webauthn')} style={{
                  padding: 14, border: '1.5px solid var(--primary)', borderRadius: 8, background: 'var(--primary-tint)',
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <Icon name="fingerprint" size={28} color="var(--primary)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      Passkey · WebAuthn <span className="badge badge-success" style={{ fontSize: 10 }}>Khuyên dùng</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>
                      Vân tay / Face ID — không cần mã OTP
                    </div>
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--ink-400)" />
                </button>

                <button onClick={next('mfa-totp')} style={{
                  padding: 14, border: '1px solid var(--ink-200)', borderRadius: 8,
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, background: 'white',
                }}>
                  <Icon name="key" size={26} color="var(--ink-700)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Authenticator app · TOTP</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>
                      Mã 6 số từ Google / Microsoft Authenticator
                    </div>
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--ink-400)" />
                </button>

                <button style={{
                  padding: 14, border: '1px solid var(--ink-200)', borderRadius: 8,
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, background: 'white',
                }}>
                  <Icon name="phone" size={26} color="var(--ink-700)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>SMS OTP</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>
                      Gửi mã đến 0912 ••• 789 · <span style={{ color: 'var(--warn)' }}>kém an toàn hơn</span>
                    </div>
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--ink-400)" />
                </button>
              </div>

              <div style={{ marginTop: 20, padding: 12, background: 'var(--warn-soft)', borderRadius: 6, fontSize: 11, color: '#856200', lineHeight: 1.55 }}>
                <b>⚠ Vì sao MFA?</b> Phòng chống credential stuffing & account takeover. Theo Keycloak realm policy, tài khoản có lịch sử mua hàng &gt; 5 triệu phải bật MFA.
              </div>
            </div>
          )}

          {step === 'mfa-totp' && (
            <div>
              <button onClick={next('mfa-pick')} style={{ color: 'var(--ink-500)', fontSize: 12, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="arrow-left" size={12} /> Quay lại
              </button>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Nhập mã từ Authenticator</div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 24 }}>
                Mở ứng dụng <b>Google / Microsoft Authenticator</b> và nhập mã 6 số đang hiển thị cho UIT Store.
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
                {totp.map((d, i) => (
                  <input key={i} id={`totp-${i}`} value={d} onChange={e => setDigit(i, e.target.value)} maxLength="1" inputMode="numeric"
                    style={{
                      width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 600,
                      border: `1.5px solid ${d ? 'var(--primary)' : 'var(--ink-200)'}`,
                      background: d ? 'var(--primary-tint)' : 'white',
                      borderRadius: 6, outline: 'none',
                    }} />
                ))}
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: 12 }}
                onClick={() => onLogin({ name: 'Nguyễn Văn An', initial: 'A', email })}
                disabled={totp.some(d => !d)}>
                Xác nhận đăng nhập
              </button>

              <div style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-500)', textAlign: 'center' }}>
                Không truy cập được ứng dụng? <a style={{ color: 'var(--primary)' }}>Dùng mã backup</a>
              </div>

              <div style={{ marginTop: 18, padding: 12, background: 'var(--ink-100)', borderRadius: 6, fontSize: 11, color: 'var(--ink-600)', lineHeight: 1.6, fontFamily: 'JetBrains Mono, monospace' }}>
                TOTP_SECRET = base32(•••••••••) · period=30s · digits=6 · alg=SHA-1
              </div>
            </div>
          )}

          {step === 'mfa-webauthn' && (
            <div style={{ textAlign: 'center', paddingTop: 30 }}>
              <button onClick={next('mfa-pick')} style={{ color: 'var(--ink-500)', fontSize: 12, marginBottom: 30, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="arrow-left" size={12} /> Quay lại
              </button>

              {webAuthnState === 'idle' && (
                <>
                  <div style={{
                    width: 90, height: 90, borderRadius: '50%', background: 'var(--primary-tint)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
                  }}>
                    <Icon name="fingerprint" size={48} color="var(--primary)" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Xác thực bằng Passkey</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 24, lineHeight: 1.55 }}>
                    Hệ thống sẽ yêu cầu thiết bị của bạn (Touch ID / Face ID / Windows Hello) xác thực bằng khoá riêng đã đăng ký với UIT Store.
                  </div>
                  <button onClick={tryWebAuthn} className="btn btn-primary" style={{ padding: '12px 28px' }}>
                    Bắt đầu xác thực
                  </button>
                </>
              )}

              {webAuthnState === 'prompting' && (
                <>
                  <div style={{
                    width: 90, height: 90, borderRadius: '50%', background: 'var(--primary-tint)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
                    animation: 'secure-pulse 1.5s infinite',
                  }}>
                    <Icon name="fingerprint" size={48} color="var(--primary)" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Đang chờ xác thực sinh trắc...</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-600)' }}>Vui lòng chạm cảm biến vân tay / nhìn vào camera</div>
                </>
              )}

              {webAuthnState === 'signing' && (
                <>
                  <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 18px', borderWidth: 3 }} />
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Đang ký challenge...</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--ink-600)' }}>navigator.credentials.get({'{ challenge }'}) · alg=ES256</div>
                </>
              )}

              {webAuthnState === 'success' && (
                <>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%', background: 'var(--success)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
                  }}>
                    <Icon name="check" size={40} color="white" stroke={3} />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Đăng nhập thành công!</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>Đang chuyển hướng...</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Merchant Dashboard ──────────────────────────────────────────────
const MerchantScreen = ({ onNav }) => {
  const products = window.PRODUCTS.slice(0, 6);

  const stats = [
    { label: 'Doanh thu hôm nay', value: '12.480.000đ', delta: '+18.4%', positive: true, icon: 'wallet' },
    { label: 'Đơn hàng', value: '147', delta: '+12 đơn', positive: true, icon: 'package' },
    { label: 'Sản phẩm đang bán', value: '328', delta: '12 cần duyệt', positive: false, icon: 'tag' },
    { label: 'Lượt xem shop', value: '8.4k', delta: '+24%', positive: true, icon: 'eye' },
  ];

  return (
    <div className="merchant-container">
      {/* Sidebar */}
      <div className="merchant-sidebar">
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--ink-100)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>SELLER CENTER</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>TechWorld Official</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <span className="badge badge-success" style={{ fontSize: 10 }}>
              <Icon name="check-circle" size={10}/> Mall
            </span>
            <span className="badge badge-primary" style={{ fontSize: 10 }}>
              <Icon name="star" size={10}/> 4.9
            </span>
          </div>
        </div>
        {[
          { id: 'dash', icon: 'dashboard', label: 'Tổng quan', active: true },
          { id: 'orders', icon: 'package', label: 'Đơn hàng', count: 12 },
          { id: 'products', icon: 'tag', label: 'Sản phẩm' },
          { id: 'promo', icon: 'gift', label: 'Khuyến mãi' },
          { id: 'analytics', icon: 'eye', label: 'Phân tích bán hàng' },
          { id: 'finance', icon: 'wallet', label: 'Tài chính · Thanh toán' },
          { id: 'security', icon: 'shield-check', label: 'Bảo mật shop' },
          { id: 'settings', icon: 'lock', label: 'Cài đặt' },
        ].map(item => (
          <div key={item.id} style={{
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: item.active ? 'var(--primary)' : 'var(--ink-700)',
            background: item.active ? 'var(--primary-tint)' : 'transparent',
            borderLeft: `3px solid ${item.active ? 'var(--primary)' : 'transparent'}`,
            cursor: 'pointer',
          }}>
            <Icon name={item.icon} size={16} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.count && (
              <span style={{
                fontSize: 10, padding: '1px 5px', background: 'var(--price)',
                color: 'white', borderRadius: 8, fontWeight: 600,
              }}>{item.count}</span>
            )}
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 24, background: 'var(--bg)', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Tổng quan</h1>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 2 }}>Chào mừng trở lại! Hôm nay là Thứ 7, 24/5/2026</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>
              <Icon name="plus" size={14}/> Thêm sản phẩm
            </button>
            <button onClick={() => onNav('home')} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: 13, border: '1px solid var(--ink-200)' }}>
              ← Về trang mua sắm
            </button>
          </div>
        </div>

        {/* Security alert with crypto info */}
        <div className="card" style={{
          padding: 16, marginBottom: 18,
          background: 'linear-gradient(90deg, #E8F7EE, #F0FAF3)',
          border: '1px solid #BDE5CA',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <Icon name="shield-check" size={28} color="var(--success)" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Shop của bạn đang bảo mật ở mức cao</div>
            <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>
              MFA: <b>WebAuthn (passkey)</b> · API key: <b>rotated 3 ngày trước</b> · Email/phone: <b>field-encrypted</b> qua Vault Transit
            </div>
          </div>
          <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>Xem chi tiết →</button>
        </div>

        {/* KPI cards */}
        <div className="merchant-kpi-grid">
          {stats.map(s => (
            <div key={s.label} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>{s.label}</span>
                <div style={{
                  width: 32, height: 32, borderRadius: 6, background: 'var(--primary-tint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={s.icon} size={14} color="var(--primary)" />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{
                fontSize: 11, marginTop: 4,
                color: s.positive ? 'var(--success)' : 'var(--warn)',
              }}>
                {s.delta} so với hôm qua
              </div>
            </div>
          ))}
        </div>

        {/* Chart + recent orders */}
        <div className="merchant-chart-grid">
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Doanh thu 7 ngày qua</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {['7 ngày', '30 ngày', '90 ngày'].map((t, i) => (
                  <button key={t} style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11,
                    background: i === 0 ? 'var(--primary-tint)' : 'transparent',
                    color: i === 0 ? 'var(--primary)' : 'var(--ink-600)',
                    border: '1px solid var(--ink-200)',
                  }}>{t}</button>
                ))}
              </div>
            </div>
            {/* Simple bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180, padding: '0 4px', overflowX: 'auto' }}>
              {[
                { d: 'T2', v: 65 }, { d: 'T3', v: 88 }, { d: 'T4', v: 72 },
                { d: 'T5', v: 95 }, { d: 'T6', v: 78 }, { d: 'T7', v: 100 }, { d: 'CN', v: 82 },
              ].map((b, i) => (
                <div key={b.d} style={{ flex: 1, minWidth: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-600)', fontWeight: 600 }}>
                    {(b.v * 124800).toLocaleString('vi-VN')}
                  </div>
                  <div style={{
                    width: '100%', maxWidth: 40, height: `${b.v * 1.4}px`,
                    background: i === 5 ? 'var(--primary)' : 'var(--primary-soft)',
                    borderRadius: '4px 4px 0 0',
                  }} />
                  <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>{b.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Cần xử lý ngay</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { n: 12, l: 'Đơn chờ xác nhận', c: 'var(--warn)', i: 'package' },
                { n: 3, l: 'Đơn cần đóng gói', c: 'var(--primary)', i: 'gift' },
                { n: 1, l: 'Yêu cầu trả hàng', c: 'var(--price)', i: 'arrow-left' },
                { n: 2, l: 'Sản phẩm sắp hết', c: 'var(--warn)', i: 'bell' },
                { n: 1, l: 'Khoá API sắp hết hạn', c: 'var(--price)', i: 'key' },
              ].map(t => (
                <div key={t.l} style={{
                  padding: '10px 12px', borderRadius: 6, background: 'var(--ink-100)',
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 6, background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: t.c, fontWeight: 700, fontSize: 13,
                  }}>{t.n}</div>
                  <div style={{ flex: 1, fontSize: 12 }}>{t.l}</div>
                  <Icon name="chevron-right" size={12} color="var(--ink-400)" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product table */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Sản phẩm bán chạy</h3>
            <button style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>Xem tất cả →</button>
          </div>
          <div className="table-responsive">
            <div className="table-min-width">
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 2.5fr 1fr 1fr 1fr 0.8fr 1fr',
                gap: 12, alignItems: 'center', padding: '8px 12px',
                background: 'var(--ink-100)', borderRadius: 6, fontSize: 11,
                color: 'var(--ink-600)', fontWeight: 600,
              }}>
                <span></span>
                <span>Sản phẩm</span>
                <span>SKU</span>
                <span>Giá</span>
                <span>Đã bán</span>
                <span style={{ textAlign: 'center' }}>Tồn</span>
                <span style={{ textAlign: 'center' }}>Trạng thái</span>
              </div>
              {products.map(p => (
                <div key={p.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 2.5fr 1fr 1fr 1fr 0.8fr 1fr',
                  gap: 12, alignItems: 'center', padding: '12px',
                  borderBottom: '1px solid var(--ink-100)', fontSize: 13,
                }}>
                  <div className="ph-img" style={{ width: 44, height: 44, borderRadius: 4, fontSize: 9 }}>{p.brand}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 500, lineHeight: 1.35,
                      display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{p.brand}</div>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-600)' }}>{p.sku}</span>
                  <span style={{ fontWeight: 600, color: 'var(--price)' }}>{window.formatVND(p.base_price)}</span>
                  <span>{p.sold.toLocaleString()}</span>
                  <span style={{ textAlign: 'center', color: p.sold < 500 ? 'var(--warn)' : 'var(--ink-700)' }}>{248 - (p.id.charCodeAt(2) % 100)}</span>
                  <div style={{ textAlign: 'center' }}>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>● Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit log strip */}
        <div className="card" style={{ padding: 16, marginTop: 14 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield-check" size={14} color="var(--primary)" /> Hoạt động bảo mật gần đây
          </h3>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-600)', lineHeight: 1.7 }}>
            <div>10:42 · API key rotated · key-id=mch_techworld_v3 → v4 · by=auto-rotation</div>
            <div>10:42 · WebAuthn challenge passed · device="MacBook Pro · Touch ID"</div>
            <div>09:18 · Product update · sku=IP15PM-256-NTI · sig=hmac-sha256(✓) · field-encrypted fields untouched</div>
            <div>08:55 · Login from new device · ip=14.224.x.x · risk-score=0.12 (low) · MFA=ok</div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { LoginScreen, MerchantScreen });
