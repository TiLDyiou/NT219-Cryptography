// UIT Store — Login (with MFA) and Merchant Dashboard

// ─── Login Screen with MFA ──────────────────────────────────────────
const LoginScreen = ({ onLogin, onNav }) => {
  const [step, setStep] = React.useState('credentials'); // credentials, mfa-pick, mfa-totp, mfa-webauthn, mfa-sms
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [totp, setTotp] = React.useState(['', '', '', '', '', '']);
  const [smsOtp, setSmsOtp] = React.useState(['', '', '', '', '', '']);
  const [rememberDevice, setRememberDevice] = React.useState(false);
  const [webAuthnState, setWebAuthnState] = React.useState('idle');
  const [loading, setLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');

  const next = (target) => () => setStep(target);

  const handleCredentialsSubmit = async () => {
    if (!window.UitAuth) {
      setLoginError('Dịch vụ xác thực chưa sẵn sàng.');
      return;
    }
    setLoading(true);
    setLoginError('');
    const result = await window.UitAuth.loginWithPassword(email, password);
    setLoading(false);
    if (result.ok) {
      onLogin(result.user);
    } else if (result.mfaRequired) {
      setStep('mfa-totp');
    } else {
      setLoginError(result.error || 'Sai email hoặc mật khẩu');
    }
  };

  const handleTotpSubmit = async () => {
    if (!window.UitAuth) {
      setLoginError('Dịch vụ xác thực chưa sẵn sàng.');
      return;
    }
    const otpCode = totp.join('');
    setLoading(true);
    setLoginError('');
    const result = await window.UitAuth.loginWithPassword(email, password, otpCode);
    setLoading(false);
    if (result.ok) {
      onLogin(result.user);
    } else {
      setLoginError(result.error || 'Mã OTP không đúng');
      setTotp(['', '', '', '', '', '']);
    }
  };

  const setDigit = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...totp]; next[i] = v;
    setTotp(next);
    if (v && i < 5) {
      const el = document.getElementById(`totp-${i+1}`);
      if (el) el.focus();
    }
    if (next.every(d => d) && i === 5) {
      setTimeout(handleTotpSubmit, 200);
    }
  };

  const tryWebAuthn = () => {
    if (window.UitAuth) window.UitAuth.loginRedirect();
    else setLoginError('Dịch vụ xác thực chưa sẵn sàng.');
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
                <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email đã đăng ký" autoFocus />
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
                  <input type="checkbox" checked={rememberDevice} onChange={e => setRememberDevice(e.target.checked)} /> Ghi nhớ thiết bị này
                </label>
                <a style={{ color: 'var(--primary)', cursor: 'pointer' }}
                   onClick={() => {
                     const url = window.UitAuth ? window.UitAuth.issuer + '/login-actions/reset-credentials' : null;
                     if (url) window.open(url, '_blank');
                     else setLoginError('Tính năng khôi phục mật khẩu cần kết nối Keycloak.');
                   }}>
                  Quên mật khẩu?
                </a>
              </div>

              {loginError && (
                <div style={{ padding: '10px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 12, color: '#B91C1C', marginBottom: 12 }}>
                  {loginError}
                </div>
              )}
              <button onClick={handleCredentialsSubmit} disabled={loading || !password} className="btn btn-primary" style={{ width: '100%', padding: 12, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0', color: 'var(--ink-400)', fontSize: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--ink-200)' }} />
                Hoặc
                <div style={{ flex: 1, height: 1, background: 'var(--ink-200)' }} />
              </div>

              <button onClick={() => window.UitAuth ? window.UitAuth.loginRedirect() : tryWebAuthn()} style={{
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
                Chưa có tài khoản?{' '}
                <a style={{ color: 'var(--primary)', fontWeight: 500, cursor: 'pointer' }}
                   onClick={() => onNav('register')}>
                  Đăng ký ngay
                </a>
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

                <button onClick={next('mfa-sms')} style={{
                  padding: 14, border: '1px solid var(--ink-200)', borderRadius: 8,
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, background: 'white',
                }}>
                  <Icon name="phone" size={26} color="var(--ink-700)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>SMS OTP</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>
                      Gửi mã đến SĐT đăng ký · <span style={{ color: 'var(--warn)' }}>kém an toàn hơn</span>
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

              {loginError && (
                <div style={{ padding: '10px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 12, color: '#B91C1C', marginBottom: 10 }}>
                  {loginError}
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', padding: 12, opacity: loading ? 0.7 : 1 }}
                onClick={handleTotpSubmit}
                disabled={totp.some(d => !d) || loading}>
                {loading ? 'Đang xác thực...' : 'Xác nhận đăng nhập'}
              </button>

              <div style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-500)', textAlign: 'center' }}>
                Không truy cập được ứng dụng?{' '}
                <a style={{ color: 'var(--primary)', cursor: 'pointer' }}
                   onClick={() => setLoginError('Nhập mã recovery từ file đã lưu khi thiết lập MFA (dạng: XXXX-XXXX-XXXX-XXXX)')}>
                  Dùng mã backup
                </a>
              </div>

              <div style={{ marginTop: 18, padding: 12, background: 'var(--ink-100)', borderRadius: 6, fontSize: 11, color: 'var(--ink-600)', lineHeight: 1.6, fontFamily: 'JetBrains Mono, monospace' }}>
                TOTP_SECRET = base32(•••••••••) · period=30s · digits=6 · alg=SHA-1
              </div>
            </div>
          )}

          {step === 'mfa-sms' && (
            <div>
              <button onClick={next('mfa-pick')} style={{ color: 'var(--ink-500)', fontSize: 12, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="arrow-left" size={12} /> Quay lại
              </button>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Xác thực qua SMS</div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 24 }}>
                Mã OTP 6 số đã được gửi đến số điện thoại đăng ký.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
                {smsOtp.map((d, i) => (
                  <input key={i} id={`sms-${i}`} value={d}
                    onChange={e => {
                      if (!/^\d?$/.test(e.target.value)) return;
                      const next2 = [...smsOtp]; next2[i] = e.target.value;
                      setSmsOtp(next2);
                      if (e.target.value && i < 5) { const el = document.getElementById(`sms-${i+1}`); if (el) el.focus(); }
                    }}
                    maxLength="1" inputMode="numeric"
                    style={{
                      width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 600,
                      border: `1.5px solid ${d ? 'var(--primary)' : 'var(--ink-200)'}`,
                      background: d ? 'var(--primary-tint)' : 'white',
                      borderRadius: 6, outline: 'none',
                    }} />
                ))}
              </div>
              {loginError && (
                <div style={{ padding: '10px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 12, color: '#B91C1C', marginBottom: 10 }}>
                  {loginError}
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', padding: 12 }}
                disabled={smsOtp.some(d => !d) || loading}
                onClick={() => setLoginError('SMS OTP cần được xác thực bởi Keycloak trước khi đăng nhập.')}>
                Xác nhận đăng nhập
              </button>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-500)', textAlign: 'center' }}>
                <a style={{ color: 'var(--primary)', cursor: 'pointer' }}
                   onClick={() => setSmsOtp(['','','','','',''])}>
                  Gửi lại SMS
                </a>
              </div>
              <div style={{ marginTop: 14, padding: 10, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, fontSize: 11, color: '#92400E' }}>
                ⚠ SMS OTP dễ bị SIM-swap và SS7 attack. Khuyến nghị dùng WebAuthn hoặc TOTP.
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
const MerchantScreen = ({ onNav, user, setUser }) => {
  const [merchantProfile, setMerchantProfile] = React.useState(null);
  const [merchantChecked, setMerchantChecked] = React.useState(false);
  const [showRegForm, setShowRegForm] = React.useState(false);
  const [regShopName, setRegShopName] = React.useState('');
  const [regShopCode, setRegShopCode] = React.useState('');
  const [regLoading, setRegLoading] = React.useState(false);
  const [regError, setRegError] = React.useState('');
  const [regSuccess, setRegSuccess] = React.useState(false);

  const currentMerchantProfile = merchantProfile && user && merchantProfile.id === user.id ? merchantProfile : null;
  const merchantId = (currentMerchantProfile && currentMerchantProfile.id) || (user && user.id);
  const shopName = (currentMerchantProfile && currentMerchantProfile.metadata_json && currentMerchantProfile.metadata_json.shop_name)
    || (user ? (user.name || user.email || 'Seller Center') : 'Seller Center');
  const products = (window.PRODUCTS || []).filter(p => p.merchant_id === merchantId).slice(0, 6);
  const [activeSection, setActiveSection] = React.useState('dash');
  const [orders, setOrders] = React.useState([]);
  const roles = (user && user.roles) || [];
  const isMerchant = roles.includes('merchant') || !!currentMerchantProfile;

  React.useEffect(() => {
    if (!user || !window.UitAPI || !window.UitAPI.merchant || !window.UitAPI.merchant.me) {
      setMerchantProfile(null);
      setMerchantChecked(!!user);
      return;
    }

    let cancelled = false;
    setMerchantChecked(false);
    window.UitAPI.merchant.me()
      .then(res => {
        if (!cancelled && res && res.data) setMerchantProfile(res.data);
      })
      .catch(() => {
        if (!cancelled) setMerchantProfile(null);
      })
      .finally(() => {
        if (!cancelled) setMerchantChecked(true);
      });

    return () => { cancelled = true; };
  }, [user && user.id]);

  React.useEffect(() => {
    if (!merchantId || !isMerchant) return;
    const BASE = window.UitAPI && window.UitAPI.backendUrl;
    if (!BASE) return;
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    const headers = t
      ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }
      : { 'Content-Type': 'application/json', 'X-User-Id': user && user.id };

    fetch(`${BASE}/api/v1/orders/merchant/orders?merchant_id=${merchantId}`, { headers })
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.data)) {
          setOrders(d.data);
        }
      })
      .catch(e => console.error("Error loading merchant orders in dashboard:", e));
  }, [merchantId, user, isMerchant]);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length;

  const SECTION_TITLES = {
    dash: 'Tổng quan', orders: 'Đơn hàng', products: 'Sản phẩm',
    promo: 'Khuyến mãi', analytics: 'Phân tích bán hàng',
    finance: 'Tài chính · Thanh toán', security: 'Bảo mật shop', settings: 'Cài đặt',
  };

  // Delegate render to section component (loaded via separate script tags)
  const renderSection = () => {
    const props = { merchantId, user };
    const map = {
      orders:    window.MerchantOrdersSection,
      products:  window.MerchantProductsSection,
      finance:   window.MerchantFinanceSection,
      security:  window.MerchantSecuritySection,
      analytics: window.MerchantAnalyticsSection,
      promo:     window.MerchantPromoSection,
      settings:  window.MerchantSettingsSection,
    };
    const Comp = map[activeSection];
    if (Comp) return React.createElement(Comp, props);
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-500)' }}>
        Section đang được phát triển...
      </div>
    );
  };

  // Dynamic KPIs calculations
  const productsCount = (window.PRODUCTS || []).filter(p => p.merchant_id === merchantId).length;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 1);
  
  const todayRevenue = orders.filter(o => {
    if (o.status === 'cancelled') return false;
    const oDate = new Date(o.created_at || new Date());
    return oDate >= today && oDate < nextDay;
  }).reduce((sum, o) => sum + o.total_amount, 0);

  const stats = [
    { label: 'Doanh thu hôm nay', value: todayRevenue.toLocaleString('vi-VN') + 'đ', delta: 'Cập nhật', positive: true, icon: 'wallet' },
    { label: 'Đơn hàng', value: orders.length.toString(), delta: pendingCount > 0 ? `${pendingCount} chờ duyệt` : 'Đã xử lý', positive: pendingCount === 0, icon: 'package' },
    { label: 'Sản phẩm đang bán', value: productsCount.toString(), delta: 'Đang hoạt động', positive: true, icon: 'tag' },
  ];

  // Dynamic Chart calculations
  const getRevenueLast7Days = () => {
    const data = [];
    const days = ['CN','T2','T3','T4','T5','T6','T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      d.setHours(0,0,0,0);
      const endD = new Date(d);
      endD.setDate(d.getDate() + 1);
      
      const dayRev = orders.filter(o => {
        if (o.status === 'cancelled') return false;
        const oDate = new Date(o.created_at || new Date());
        return oDate >= d && oDate < endD;
      }).reduce((sum, o) => sum + o.total_amount, 0);
      
      data.push({ d: dayName, realAmount: dayRev });
    }
    const maxRev = Math.max(...data.map(i => i.realAmount), 1);
    return data.map(item => ({
      d: item.d,
      v: Math.round((item.realAmount / maxRev) * 100),
      realAmount: item.realAmount
    }));
  };
  const chartData = getRevenueLast7Days();

  if (!user) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <Icon name="lock" size={40} color="var(--ink-400)" />
          <div style={{ fontSize: 20, fontWeight: 600, margin: '12px 0 8px' }}>Cần đăng nhập người bán</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 20, lineHeight: 1.6 }}>
            Seller Center chỉ hiển thị dữ liệu từ backend sau khi đăng nhập.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => window.UitAuth && window.UitAuth.loginRedirect()} className="btn btn-outline" style={{ padding: '10px 24px' }}>
              Đăng nhập
            </button>
            <button onClick={() => onNav('home')} className="btn btn-outline" style={{ padding: '10px 24px' }}>
              Về trang mua sắm
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!merchantChecked) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Đang kiểm tra trạng thái người bán</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.6 }}>
            Hệ thống đang xác nhận cửa hàng gắn với tài khoản hiện tại.
          </div>
        </div>
      </div>
    );
  }

  if (regSuccess) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#DEF7EC',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          }}>
            <Icon name="check-circle" size={40} color="#10B981" stroke={3} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, color: '#10B981' }}>Đăng ký thành công!</div>
          <div style={{ fontSize: 14, color: 'var(--ink-600)', lineHeight: 1.6 }}>
            Cửa hàng <b>{regShopName}</b> đã được tạo trên hệ thống.<br />Hệ thống đang chuẩn bị chuyển hướng bạn đến Dashboard...
          </div>
        </div>
      </div>
    );
  }

  // Luồng Đăng ký người bán hoặc chặn quyền truy cập
  if (!isMerchant) {
    const handleRegisterSubmit = () => {
      setRegError('');
      const nameVal = regShopName.trim();
      const codeVal = regShopCode.trim();
      if (!nameVal || !codeVal) {
        setRegError('Vui lòng điền đầy đủ tên cửa hàng và mã định danh.');
        return;
      }
      if (!/^[a-z0-9-_]+$/.test(codeVal)) {
        setRegError('Mã định danh chỉ được chứa chữ thường không dấu, số, gạch ngang (-) và gạch dưới (_).');
        return;
      }
      setRegLoading(true);
      window.UitAPI.merchant.register({ name: nameVal, code: codeVal })
        .then(res => {
          if (res && res.data) setMerchantProfile(res.data);
          setRegSuccess(true);
          setTimeout(() => {
            const updatedUser = {
              ...user,
              roles: (user.roles || []).includes('merchant') ? user.roles : [...(user.roles || []), 'merchant']
            };
            if (setUser) setUser(updatedUser);
            try {
              sessionStorage.setItem('nt219_user', JSON.stringify(updatedUser));
            } catch (e) {}
            setShowRegForm(false);
            setRegSuccess(false);
          }, 1200);
        })
        .catch(err => {
          setRegError(err.message || 'Có lỗi xảy ra trong quá trình đăng ký.');
        })
        .finally(() => {
          setRegLoading(false);
        });
    };

    if (showRegForm) {
      return (
        <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
          <div className="card" style={{ padding: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Đăng ký Kênh người bán</div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 20 }}>
              Mở rộng kinh doanh của bạn bằng cách tạo một cửa hàng trên hệ thống.
            </div>

            {regError && (
              <div style={{ padding: '10px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 12, color: '#B91C1C', marginBottom: 16 }}>
                {regError}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Tên cửa hàng (Shop Name)</label>
              <input className="input" value={regShopName} onChange={e => {
                setRegShopName(e.target.value);
                if (regShopCode === '') {
                  setRegShopCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''));
                }
              }} placeholder="Tech World, Tiệm Sách Nhỏ..." disabled={regLoading} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Mã định danh (Shop Code / Slug)</label>
              <input className="input" value={regShopCode} onChange={e => setRegShopCode(e.target.value)}
                placeholder="techworld, tiem-sach-nho" disabled={regLoading} />
              <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>
                Dùng làm URL định danh cho cửa hàng. Chỉ gồm chữ thường, số và gạch ngang.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleRegisterSubmit} disabled={regLoading} className="btn btn-primary" style={{ flex: 1, padding: '10px 20px' }}>
                {regLoading ? 'Đang xử lý...' : 'Xác nhận tạo Shop'}
              </button>
              <button onClick={() => setShowRegForm(false)} disabled={regLoading} className="btn btn-outline" style={{ padding: '10px 20px' }}>
                Quay lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center', border: '1px solid #FCA5A5' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#FEE2E2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          }}>
            <Icon name="shield-check" size={40} color="#EF4444" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, margin: '12px 0 8px', color: '#B91C1C' }}>Không có quyền truy cập</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 24, lineHeight: 1.6 }}>
            Tài khoản <b>{user.email || user.name}</b> không có quyền người bán (merchant). Hãy chọn đăng ký để bắt đầu bán hàng hoặc đăng nhập bằng tài khoản khác.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexDirection: 'column' }}>
            <button onClick={() => setShowRegForm(true)} className="btn btn-primary" style={{ padding: '12px 24px', fontWeight: 600 }}>
              Đăng ký làm Người bán ngay
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => window.UitAuth && window.UitAuth.logout()} className="btn btn-outline" style={{ flex: 1, padding: '10px 20px' }}>
                Đăng nhập tài khoản khác
              </button>
              <button onClick={() => onNav('home')} className="btn btn-outline" style={{ flex: 1, padding: '10px 20px' }}>
                Về trang mua sắm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-container">
      {/* Sidebar */}
      <div className="merchant-sidebar">
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--ink-100)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>SELLER CENTER</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{shopName}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="badge badge-success" style={{ fontSize: 10 }}>
              <Icon name="check-circle" size={10}/> Mall
            </span>
            <span className="badge badge-primary" style={{ fontSize: 10 }}>
              <Icon name="key" size={10}/> Keycloak
            </span>
          </div>
          {user && (
            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="lock" size={10} color="var(--success)" />
              <span style={{ fontFamily: 'monospace' }}>{user.email}</span>
            </div>
          )}
        </div>
        {[
          { id: 'dash',     icon: 'dashboard',   label: 'Tổng quan' },
          { id: 'orders',   icon: 'package',     label: 'Đơn hàng',              count: pendingCount },
          { id: 'products', icon: 'tag',          label: 'Sản phẩm' },
          { id: 'promo',    icon: 'gift',         label: 'Khuyến mãi' },
          { id: 'analytics',icon: 'eye',          label: 'Phân tích bán hàng' },
          { id: 'finance',  icon: 'wallet',       label: 'Tài chính · Thanh toán' },
          { id: 'security', icon: 'shield-check', label: 'Bảo mật shop' },
          { id: 'settings', icon: 'lock',         label: 'Cài đặt' },
        ].map(item => (
          <div key={item.id} onClick={() => setActiveSection(item.id)} style={{
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: activeSection === item.id ? 'var(--primary)' : 'var(--ink-700)',
            background: activeSection === item.id ? 'var(--primary-tint)' : 'transparent',
            borderLeft: `3px solid ${activeSection === item.id ? 'var(--primary)' : 'transparent'}`,
            cursor: 'pointer',
          }}>
            <Icon name={item.icon} size={16} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {typeof item.count === 'number' && item.count > 0 && (
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
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{SECTION_TITLES[activeSection] || activeSection}</h1>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 2 }}>Chào mừng trở lại! Hôm nay là {['CN','T2','T3','T4','T5','T6','T7'][new Date().getDay()]}, {new Date().getDate()}/{new Date().getMonth()+1}/{new Date().getFullYear()}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => setActiveSection('products')}>
              <Icon name="plus" size={14}/> Thêm sản phẩm
            </button>
            <button onClick={() => onNav('home')} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: 13, border: '1px solid var(--ink-200)' }}>
              ← Về trang mua sắm
            </button>
          </div>
        </div>

        {/* Section components */}
        {activeSection !== 'dash' && renderSection()}

        {/* Dashboard — chỉ hiển thị khi activeSection === 'dash' */}
        {activeSection === 'dash' && <>

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
              MFA và API key được quản lý bởi Keycloak/backend. Email/phone: <b>field-encrypted</b> qua Vault Transit
            </div>
          </div>
          <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => setActiveSection('security')}>Xem chi tiết →</button>
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
            </div>
            {chartData.every(b => b.realAmount === 0) ? (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-400)', fontSize: 12 }}>
                Chưa có doanh thu từ backend.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180, padding: '0 4px', overflowX: 'auto' }}>
                {chartData.map((b) => (
                  <div key={b.d} style={{ flex: 1, minWidth: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-600)', fontWeight: 600 }}>
                      {b.realAmount.toLocaleString('vi-VN')}
                    </div>
                    <div style={{
                      width: '100%', maxWidth: 40, height: `${Math.max(b.v * 1.4, 4)}px`,
                      background: 'var(--primary-soft)',
                      borderRadius: '4px 4px 0 0',
                    }} />
                    <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>{b.d}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Cần xử lý ngay</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { n: pendingCount, l: 'Đơn chờ xác nhận', c: 'var(--warn)',    i: 'package',  section: 'orders'   },
                { n: confirmedCount,  l: 'Đơn cần đóng gói', c: 'var(--primary)', i: 'gift',     section: 'orders'   },
              ].filter(t => t.n > 0).map(t => (
                <div key={t.l} onClick={() => setActiveSection(t.section)} style={{
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
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Sản phẩm từ catalog</h3>
            <button style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}
              onClick={() => setActiveSection('products')}>Xem tất cả →</button>
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
                  <span>{typeof p.sold === 'number' ? p.sold.toLocaleString('vi-VN') : '—'}</span>
                  <span style={{ textAlign: 'center' }}>{typeof p.stock === 'number' ? p.stock : '—'}</span>
                  <div style={{ textAlign: 'center' }}>
                    {p.is_active === false
                      ? <span className="badge" style={{ fontSize: 10, background: 'var(--ink-100)', color: 'var(--ink-500)' }}>Ẩn</span>
                      : <span className="badge badge-success" style={{ fontSize: 10 }}>Active</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        </>}
      </div>
    </div>
  );
};

// ─── Register Screen ────────────────────────────────────────────────
const RegisterScreen = ({ onLogin, onNav }) => {
  const [name, setName]           = React.useState('');
  const [email, setEmail]         = React.useState('');
  const [password, setPassword]   = React.useState('');
  const [confirm, setConfirm]     = React.useState('');
  const [loading, setLoading]     = React.useState(false);
  const [error, setError]         = React.useState('');
  const [showPw, setShowPw]       = React.useState(false);
  const [strength, setStrength]   = React.useState(0); // 0-4

  const calcStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8)              s++;
    if (/[A-Z]/.test(pw))            s++;
    if (/[0-9]/.test(pw))            s++;
    if (/[^A-Za-z0-9]/.test(pw))     s++;
    return s;
  };

  const handlePasswordChange = (v) => {
    setPassword(v);
    setStrength(calcStrength(v));
  };

  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Tốt', 'Mạnh'];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];

  const handleSubmit = async () => {
    setError('');
    if (!name.trim())     { setError('Vui lòng nhập họ và tên.'); return; }
    if (!email.trim())    { setError('Vui lòng nhập email.'); return; }
    if (password.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự.'); return; }
    if (password !== confirm) { setError('Mật khẩu không khớp.'); return; }

    setLoading(true);
    try {
      const parts = name.trim().split(' ');
      const firstName = parts.slice(0, -1).join(' ') || parts[0];
      const lastName  = parts.length > 1 ? parts[parts.length - 1] : '';

      const backendUrl = window.UitAPI ? window.UitAPI.backendUrl : window.location.origin;
      const res = await fetch(`${backendUrl}/api/v1/catalog/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ firstName, lastName, email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.detail || 'Đăng ký thất bại. Vui lòng thử lại.');
        setLoading(false);
        return;
      }

      // Đăng ký thành công → tự động đăng nhập
      if (window.UitAuth) {
        const result = await window.UitAuth.loginWithPassword(email.trim(), password);
        if (result.ok) { onLogin(result.user); return; }
      }
      // Fallback: chuyển sang trang đăng nhập
      onNav('login');
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    }
    setLoading(false);
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
              Tạo tài khoản<br/>UIT Store
            </h2>
            <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6, maxWidth: 340 }}>
              Mật khẩu được bảo vệ bằng <b>Argon2id</b> khi lưu trên Keycloak.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: 'shield-check', t: 'Mật khẩu không bao giờ lưu plain', s: 'Argon2id · per-user salt · server-side pepper' },
              { icon: 'lock',         t: 'Phiên đăng nhập JWT 5 phút',        s: 'Refresh token rotation' },
              { icon: 'check-circle', t: 'Đăng ký qua Keycloak',              s: 'Không lưu tài khoản trong trình duyệt' },
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
        </div>

        {/* Right form */}
        <div style={{ padding: 36, display: 'flex', flexDirection: 'column' }}>
          <button onClick={() => window.UitAuth && window.UitAuth.loginRedirect()} style={{ color: 'var(--ink-500)', fontSize: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
            <Icon name="arrow-left" size={12} /> Quay lại đăng nhập
          </button>

          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Tạo tài khoản mới</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 22 }}>Điền thông tin để tạo tài khoản UIT Store</div>

          {/* Họ tên */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Họ và tên</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="Nguyễn Văn A" autoFocus />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com" />
          </div>

          {/* Mật khẩu */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPw ? 'text' : 'password'} value={password}
                onChange={e => handlePasswordChange(e.target.value)}
                placeholder="Tối thiểu 8 ký tự" style={{ paddingRight: 36 }} />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                    onClick={() => setShowPw(!showPw)}>
                <Icon name="eye" size={16} color="var(--ink-400)" />
              </span>
            </div>
          </div>

          {/* Thanh độ mạnh mật khẩu */}
          {password && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= strength ? strengthColor[strength] : 'var(--ink-200)',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: strengthColor[strength] }}>
                Độ mạnh: {strengthLabel[strength] || ''}
              </div>
            </div>
          )}

          {/* Xác nhận mật khẩu */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Xác nhận mật khẩu</label>
            <input className="input" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu"
              style={{ borderColor: confirm && confirm !== password ? '#EF4444' : undefined }} />
            {confirm && confirm !== password && (
              <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Mật khẩu không khớp</div>
            )}
          </div>

          {/* Lỗi */}
          {error && (
            <div style={{ padding: '10px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 12, color: '#B91C1C', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary"
            style={{ width: '100%', padding: 12, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>

          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-600)', textAlign: 'center' }}>
            Đã có tài khoản?{' '}
            <a style={{ color: 'var(--primary)', fontWeight: 500, cursor: 'pointer' }} onClick={() => window.UitAuth && window.UitAuth.loginRedirect()}>
              Đăng nhập
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Account Screen ──────────────────────────────────────────────────
const AccountScreen = ({ user, onNav, onLogout }) => {
  if (!user) { window.UitAuth && window.UitAuth.loginRedirect(); return null; }

  const roles = (user.roles || []).filter(r => !['default-roles-nt219','offline_access','uma_authorization'].includes(r));
  const isAdmin = roles.includes('admin');

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 16px' }}>
      {/* Profile card */}
      <div className="card" style={{ padding: 28, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, flexShrink: 0,
          }}>{user.initial}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 2 }}>{user.email}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {roles.length > 0
                ? roles.map(r => (
                    <span key={r} className="badge badge-primary" style={{ fontSize: 11 }}>{r}</span>
                  ))
                : <span className="badge" style={{ fontSize: 11, background: 'var(--ink-100)', color: 'var(--ink-600)' }}>user</span>
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => onNav('orders')} className="btn btn-outline"
            style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
            <Icon name="package" size={18} /> Đơn hàng của tôi
          </button>

          <button onClick={() => onNav('merchant')} className="btn btn-outline"
            style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
            <Icon name="dashboard" size={18} /> Kênh người bán
          </button>

          <button onClick={() => { if (window.UitAuth) window.location.href = window.UitAuth.issuer + '/account'; }}
            className="btn btn-outline"
            style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
            <Icon name="lock" size={18} /> Đổi mật khẩu / Bảo mật
          </button>

          <button onClick={onLogout}
            style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start', color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: 6, background: 'white' }}>
            <Icon name="arrow-left" size={18} /> Đăng xuất
          </button>
        </div>
      </div>

      {/* JWT info — educational */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="key" size={14} color="var(--primary)" /> Phiên đăng nhập JWT
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-600)', lineHeight: 1.8 }}>
          <div>sub: {user.id || '—'}</div>
          <div>iss: {(window.UitAuth && window.UitAuth.issuer) || '—'}</div>
          <div>exp: access_token TTL = 300s · refresh rotation ✓</div>
          <div>alg: RS256 (Keycloak)</div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { LoginScreen, RegisterScreen, AccountScreen, MerchantScreen });
