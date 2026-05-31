// UIT Store — Login (with MFA) and Merchant Dashboard

// ─── Login Screen with MFA ──────────────────────────────────────────
const LoginScreen = ({
  onLogin,
  onNav
}) => {
  const [step, setStep] = React.useState('credentials'); // credentials, mfa-pick, mfa-totp, mfa-webauthn, mfa-sms
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [totp, setTotp] = React.useState(['', '', '', '', '', '']);
  const [smsOtp, setSmsOtp] = React.useState(['', '', '', '', '', '']);
  const [rememberDevice, setRememberDevice] = React.useState(false);
  const [webAuthnState, setWebAuthnState] = React.useState('idle');
  const [loading, setLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const next = target => () => setStep(target);
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
    const next = [...totp];
    next[i] = v;
    setTotp(next);
    if (v && i < 5) {
      const el = document.getElementById(`totp-${i + 1}`);
      if (el) el.focus();
    }
    if (next.every(d => d) && i === 5) {
      setTimeout(handleTotpSubmit, 200);
    }
  };
  const tryWebAuthn = () => {
    if (window.UitAuth) window.UitAuth.loginRedirect();else setLoginError('Dịch vụ xác thực chưa sẵn sàng.');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "login-container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-visual"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--primary)',
      fontWeight: 800,
      fontSize: 16
    }
  }, "UIT"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16
    }
  }, "UIT Store")), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 26,
      lineHeight: 1.25,
      margin: '0 0 12px',
      letterSpacing: '-0.01em'
    }
  }, "\u0110\u0103ng nh\u1EADp an to\xE0n", /*#__PURE__*/React.createElement("br", null), "v\u1EDBi OAuth2 + PKCE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: 0.9,
      lineHeight: 1.6,
      maxWidth: 340
    }
  }, "UIT Store \xE1p d\u1EE5ng c\xE1c ti\xEAu chu\u1EA9n x\xE1c th\u1EF1c hi\u1EC7n \u0111\u1EA1i nh\u1EA5t:", /*#__PURE__*/React.createElement("b", null, " Authorization Code + PKCE"), ", refresh-token rotation, v\xE0 b\u1EAFt bu\u1ED9c MFA cho t\xE0i kho\u1EA3n nh\u1EA1y c\u1EA3m.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, [{
    icon: 'shield-check',
    t: 'OAuth2 / OpenID Connect',
    s: 'Token JWT ngắn hạn · refresh rotation'
  }, {
    icon: 'fingerprint',
    t: 'WebAuthn / FIDO2',
    s: 'Đăng nhập không mật khẩu — passkey'
  }, {
    icon: 'key',
    t: 'TOTP / Authenticator App',
    s: 'RFC 6238 · OTP 30 giây'
  }, {
    icon: 'lock',
    t: 'Argon2id password hashing',
    s: 'Resistant chống brute-force GPU'
  }].map(f => /*#__PURE__*/React.createElement("div", {
    key: f.t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 6,
      background: 'rgba(255,255,255,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: f.icon,
    size: 16,
    color: "white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, f.t), /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: 0.85,
      fontSize: 11
    }
  }, f.s))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -60,
      top: -60,
      width: 220,
      height: 220,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 30,
      bottom: -40,
      width: 100,
      height: 100,
      borderRadius: '50%',
      border: '2px dashed rgba(255,255,255,0.2)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 36,
      display: 'flex',
      flexDirection: 'column'
    }
  }, step === 'credentials' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Ch\xE0o m\u1EEBng tr\u1EDF l\u1EA1i"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-600)',
      marginBottom: 24
    }
  }, "\u0110\u0103ng nh\u1EADp t\xE0i kho\u1EA3n UIT Store c\u1EE7a b\u1EA1n"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 6,
      display: 'block'
    }
  }, "Email ho\u1EB7c S\u1ED1 \u0111i\u1EC7n tho\u1EA1i"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "Email \u0111\xE3 \u0111\u0103ng k\xFD",
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 6,
      display: 'block'
    }
  }, "M\u1EADt kh\u1EA9u"), /*#__PURE__*/React.createElement("div", {
    style: { display: 'flex', alignItems: 'center', border: '1px solid var(--ink-200)', borderRadius: 'var(--r-sm)', background: 'white', transition: 'border 0.15s ease' }
  }, /*#__PURE__*/React.createElement("input", {
    style: { flex: 1, padding: '10px 12px', border: 'none', outline: 'none', background: 'transparent' },
    type: showPw ? 'text' : 'password',
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement("span", {
    onClick: () => setShowPw(v => !v),
    style: { padding: '0 10px', cursor: 'pointer', lineHeight: 0, flexShrink: 0 }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 16,
    color: "var(--ink-400)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: rememberDevice,
    onChange: e => setRememberDevice(e.target.checked)
  }), " Ghi nh\u1EDB thi\u1EBFt b\u1ECB n\xE0y"), /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--primary)',
      cursor: 'pointer'
    },
    onClick: () => {
      const url = window.UitAuth ? window.UitAuth.issuer + '/login-actions/reset-credentials' : null;
      if (url) window.open(url, '_blank');else setLoginError('Tính năng khôi phục mật khẩu cần kết nối Keycloak.');
    }
  }, "Qu\xEAn m\u1EADt kh\u1EA9u?")), loginError && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#FEE2E2',
      border: '1px solid #FCA5A5',
      borderRadius: 6,
      fontSize: 12,
      color: '#B91C1C',
      marginBottom: 12
    }
  }, loginError), /*#__PURE__*/React.createElement("button", {
    onClick: handleCredentialsSubmit,
    disabled: loading || !password,
    className: "btn btn-primary",
    style: {
      width: '100%',
      padding: 12,
      opacity: loading ? 0.7 : 1
    }
  }, loading ? 'Đang xác thực...' : 'Đăng nhập'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '20px 0',
      color: 'var(--ink-400)',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--ink-200)'
    }
  }), "Ho\u1EB7c", /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--ink-200)'
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.UitAuth ? window.UitAuth.loginRedirect() : tryWebAuthn(),
    style: {
      width: '100%',
      padding: 11,
      border: '1px solid var(--ink-200)',
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontSize: 13,
      background: 'white'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "fingerprint",
    size: 16,
    color: "var(--primary)"
  }), "\u0110\u0103ng nh\u1EADp b\u1EB1ng Passkey (WebAuthn)"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      padding: 12,
      background: 'var(--ink-100)',
      borderRadius: 6,
      fontSize: 11,
      color: 'var(--ink-600)',
      lineHeight: 1.55,
      display: 'flex',
      gap: 8,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 14,
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement("span", null, "M\u1EADt kh\u1EA9u \u0111\u01B0\u1EE3c hash v\u1EDBi ", /*#__PURE__*/React.createElement("b", null, "Argon2id"), " + per-user salt + server-side pepper. UIT Store kh\xF4ng bao gi\u1EDD l\u01B0u m\u1EADt kh\u1EA9u d\u01B0\u1EDBi d\u1EA1ng plain.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      fontSize: 13,
      color: 'var(--ink-600)',
      textAlign: 'center'
    }
  }, "Ch\u01B0a c\xF3 t\xE0i kho\u1EA3n?", ' ', /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--primary)',
      fontWeight: 500,
      cursor: 'pointer'
    },
    onClick: () => onNav('register')
  }, "\u0110\u0103ng k\xFD ngay"))), step === 'mfa-pick' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: next('credentials'),
    style: {
      color: 'var(--ink-500)',
      fontSize: 12,
      marginBottom: 18,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 12
  }), " Quay l\u1EA1i"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 6
    }
  }, "X\xE1c th\u1EF1c 2 l\u1EDBp (MFA)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-600)',
      marginBottom: 24
    }
  }, "Ch\u1ECDn ph\u01B0\u01A1ng th\u1EE9c x\xE1c th\u1EF1c \u0111\u1EC3 ho\xE0n t\u1EA5t \u0111\u0103ng nh\u1EADp"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: next('mfa-webauthn'),
    style: {
      padding: 14,
      border: '1.5px solid var(--primary)',
      borderRadius: 8,
      background: 'var(--primary-tint)',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "fingerprint",
    size: 28,
    color: "var(--primary)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, "Passkey \xB7 WebAuthn ", /*#__PURE__*/React.createElement("span", {
    className: "badge badge-success",
    style: {
      fontSize: 10
    }
  }, "Khuy\xEAn d\xF9ng")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginTop: 2
    }
  }, "V\xE2n tay / Face ID \u2014 kh\xF4ng c\u1EA7n m\xE3 OTP")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 16,
    color: "var(--ink-400)"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: next('mfa-totp'),
    style: {
      padding: 14,
      border: '1px solid var(--ink-200)',
      borderRadius: 8,
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      background: 'white'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "key",
    size: 26,
    color: "var(--ink-700)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, "Authenticator app \xB7 TOTP"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginTop: 2
    }
  }, "M\xE3 6 s\u1ED1 t\u1EEB Google / Microsoft Authenticator")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 16,
    color: "var(--ink-400)"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: next('mfa-sms'),
    style: {
      padding: 14,
      border: '1px solid var(--ink-200)',
      borderRadius: 8,
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      background: 'white'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 26,
    color: "var(--ink-700)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, "SMS OTP"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginTop: 2
    }
  }, "G\u1EEDi m\xE3 \u0111\u1EBFn S\u0110T \u0111\u0103ng k\xFD \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--warn)'
    }
  }, "k\xE9m an to\xE0n h\u01A1n"))), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 16,
    color: "var(--ink-400)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      padding: 12,
      background: 'var(--warn-soft)',
      borderRadius: 6,
      fontSize: 11,
      color: '#856200',
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("b", null, "\u26A0 V\xEC sao MFA?"), " Ph\xF2ng ch\u1ED1ng credential stuffing & account takeover. Theo Keycloak realm policy, t\xE0i kho\u1EA3n c\xF3 l\u1ECBch s\u1EED mua h\xE0ng > 5 tri\u1EC7u ph\u1EA3i b\u1EADt MFA.")), step === 'mfa-totp' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: next('mfa-pick'),
    style: {
      color: 'var(--ink-500)',
      fontSize: 12,
      marginBottom: 18,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 12
  }), " Quay l\u1EA1i"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Nh\u1EADp m\xE3 t\u1EEB Authenticator"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-600)',
      marginBottom: 24
    }
  }, "M\u1EDF \u1EE9ng d\u1EE5ng ", /*#__PURE__*/React.createElement("b", null, "Google / Microsoft Authenticator"), " v\xE0 nh\u1EADp m\xE3 6 s\u1ED1 \u0111ang hi\u1EC3n th\u1ECB cho UIT Store."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'center',
      marginBottom: 18
    }
  }, totp.map((d, i) => /*#__PURE__*/React.createElement("input", {
    key: i,
    id: `totp-${i}`,
    value: d,
    onChange: e => setDigit(i, e.target.value),
    maxLength: "1",
    inputMode: "numeric",
    style: {
      width: 48,
      height: 56,
      textAlign: 'center',
      fontSize: 22,
      fontWeight: 600,
      border: `1.5px solid ${d ? 'var(--primary)' : 'var(--ink-200)'}`,
      background: d ? 'var(--primary-tint)' : 'white',
      borderRadius: 6,
      outline: 'none'
    }
  }))), loginError && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#FEE2E2',
      border: '1px solid #FCA5A5',
      borderRadius: 6,
      fontSize: 12,
      color: '#B91C1C',
      marginBottom: 10
    }
  }, loginError), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: '100%',
      padding: 12,
      opacity: loading ? 0.7 : 1
    },
    onClick: handleTotpSubmit,
    disabled: totp.some(d => !d) || loading
  }, loading ? 'Đang xác thực...' : 'Xác nhận đăng nhập'), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      fontSize: 12,
      color: 'var(--ink-500)',
      textAlign: 'center'
    }
  }, "Kh\xF4ng truy c\u1EADp \u0111\u01B0\u1EE3c \u1EE9ng d\u1EE5ng?", ' ', /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--primary)',
      cursor: 'pointer'
    },
    onClick: () => setLoginError('Nhập mã recovery từ file đã lưu khi thiết lập MFA (dạng: XXXX-XXXX-XXXX-XXXX)')
  }, "D\xF9ng m\xE3 backup")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      padding: 12,
      background: 'var(--ink-100)',
      borderRadius: 6,
      fontSize: 11,
      color: 'var(--ink-600)',
      lineHeight: 1.6,
      fontFamily: 'JetBrains Mono, monospace'
    }
  }, "TOTP_SECRET = base32(\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022) \xB7 period=30s \xB7 digits=6 \xB7 alg=SHA-1")), step === 'mfa-sms' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: next('mfa-pick'),
    style: {
      color: 'var(--ink-500)',
      fontSize: 12,
      marginBottom: 18,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 12
  }), " Quay l\u1EA1i"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 6
    }
  }, "X\xE1c th\u1EF1c qua SMS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-600)',
      marginBottom: 24
    }
  }, "M\xE3 OTP 6 s\u1ED1 \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi \u0111\u1EBFn s\u1ED1 \u0111i\u1EC7n tho\u1EA1i \u0111\u0103ng k\xFD."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'center',
      marginBottom: 18
    }
  }, smsOtp.map((d, i) => /*#__PURE__*/React.createElement("input", {
    key: i,
    id: `sms-${i}`,
    value: d,
    onChange: e => {
      if (!/^\d?$/.test(e.target.value)) return;
      const next2 = [...smsOtp];
      next2[i] = e.target.value;
      setSmsOtp(next2);
      if (e.target.value && i < 5) {
        const el = document.getElementById(`sms-${i + 1}`);
        if (el) el.focus();
      }
    },
    maxLength: "1",
    inputMode: "numeric",
    style: {
      width: 48,
      height: 56,
      textAlign: 'center',
      fontSize: 22,
      fontWeight: 600,
      border: `1.5px solid ${d ? 'var(--primary)' : 'var(--ink-200)'}`,
      background: d ? 'var(--primary-tint)' : 'white',
      borderRadius: 6,
      outline: 'none'
    }
  }))), loginError && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#FEE2E2',
      border: '1px solid #FCA5A5',
      borderRadius: 6,
      fontSize: 12,
      color: '#B91C1C',
      marginBottom: 10
    }
  }, loginError), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: '100%',
      padding: 12
    },
    disabled: smsOtp.some(d => !d) || loading,
    onClick: () => setLoginError('SMS OTP cần được xác thực bởi Keycloak trước khi đăng nhập.')
  }, "X\xE1c nh\u1EADn \u0111\u0103ng nh\u1EADp"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontSize: 12,
      color: 'var(--ink-500)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--primary)',
      cursor: 'pointer'
    },
    onClick: () => setSmsOtp(['', '', '', '', '', ''])
  }, "G\u1EEDi l\u1EA1i SMS")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      padding: 10,
      background: '#FEF3C7',
      border: '1px solid #FCD34D',
      borderRadius: 6,
      fontSize: 11,
      color: '#92400E'
    }
  }, "\u26A0 SMS OTP d\u1EC5 b\u1ECB SIM-swap v\xE0 SS7 attack. Khuy\u1EBFn ngh\u1ECB d\xF9ng WebAuthn ho\u1EB7c TOTP.")), step === 'mfa-webauthn' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      paddingTop: 30
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: next('mfa-pick'),
    style: {
      color: 'var(--ink-500)',
      fontSize: 12,
      marginBottom: 30,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 12
  }), " Quay l\u1EA1i"), webAuthnState === 'idle' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90,
      height: 90,
      borderRadius: '50%',
      background: 'var(--primary-tint)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 18px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "fingerprint",
    size: 48,
    color: "var(--primary)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "X\xE1c th\u1EF1c b\u1EB1ng Passkey"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-600)',
      marginBottom: 24,
      lineHeight: 1.55
    }
  }, "H\u1EC7 th\u1ED1ng s\u1EBD y\xEAu c\u1EA7u thi\u1EBFt b\u1ECB c\u1EE7a b\u1EA1n (Touch ID / Face ID / Windows Hello) x\xE1c th\u1EF1c b\u1EB1ng kho\xE1 ri\xEAng \u0111\xE3 \u0111\u0103ng k\xFD v\u1EDBi UIT Store."), /*#__PURE__*/React.createElement("button", {
    onClick: tryWebAuthn,
    className: "btn btn-primary",
    style: {
      padding: '12px 28px'
    }
  }, "B\u1EAFt \u0111\u1EA7u x\xE1c th\u1EF1c")), webAuthnState === 'prompting' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90,
      height: 90,
      borderRadius: '50%',
      background: 'var(--primary-tint)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 18px',
      animation: 'secure-pulse 1.5s infinite'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "fingerprint",
    size: 48,
    color: "var(--primary)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "\u0110ang ch\u1EDD x\xE1c th\u1EF1c sinh tr\u1EAFc..."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-600)'
    }
  }, "Vui l\xF2ng ch\u1EA1m c\u1EA3m bi\u1EBFn v\xE2n tay / nh\xECn v\xE0o camera")), webAuthnState === 'signing' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "spinner",
    style: {
      width: 40,
      height: 40,
      margin: '0 auto 18px',
      borderWidth: 3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "\u0110ang k\xFD challenge..."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: 'var(--ink-600)'
    }
  }, "navigator.credentials.get(", '{ challenge }', ") \xB7 alg=ES256")), webAuthnState === 'success' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: '50%',
      background: 'var(--success)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 18px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 40,
    color: "white",
    stroke: 3
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "\u0110\u0103ng nh\u1EADp th\xE0nh c\xF4ng!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)'
    }
  }, "\u0110ang chuy\u1EC3n h\u01B0\u1EDBng..."))))));
};

// ─── Merchant Dashboard ──────────────────────────────────────────────
const MerchantScreen = ({
  onNav,
  user,
  setUser
}) => {
  const [merchantProfile, setMerchantProfile] = React.useState(null);
  const [merchantChecked, setMerchantChecked] = React.useState(false);
  const [showRegForm, setShowRegForm] = React.useState(false);
  const [regShopName, setRegShopName] = React.useState('');
  const [regShopCode, setRegShopCode] = React.useState('');
  const [regLoading, setRegLoading] = React.useState(false);
  const [regError, setRegError] = React.useState('');
  const [regSuccess, setRegSuccess] = React.useState(false);
  const currentMerchantProfile = merchantProfile && user && merchantProfile.id === user.id ? merchantProfile : null;
  const merchantId = currentMerchantProfile && currentMerchantProfile.id || user && user.id;
  const shopName = currentMerchantProfile && currentMerchantProfile.metadata_json && currentMerchantProfile.metadata_json.shop_name || (user ? user.name || user.email || 'Seller Center' : 'Seller Center');
  const products = (window.PRODUCTS || []).filter(p => p.merchant_id === merchantId).slice(0, 6);
  const [activeSection, setActiveSection] = React.useState('dash');
  const [orders, setOrders] = React.useState([]);
  const roles = user && user.roles || [];
  const isMerchant = roles.includes('merchant') || !!currentMerchantProfile;
  React.useEffect(() => {
    if (!user || !window.UitAPI || !window.UitAPI.merchant || !window.UitAPI.merchant.me) {
      setMerchantProfile(null);
      setMerchantChecked(!!user);
      return;
    }
    let cancelled = false;
    let timeoutId = null;
    setMerchantChecked(false);
    const checkTimeout = new Promise(resolve => {
      timeoutId = setTimeout(() => resolve(null), 2500);
    });
    Promise.race([window.UitAPI.merchant.me().catch(() => null), checkTimeout]).then(res => {
      if (!cancelled && res && res.data) setMerchantProfile(res.data);
    }).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!cancelled) setMerchantChecked(true);
    });
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user && user.id]);
  React.useEffect(() => {
    if (!merchantId || !isMerchant) return;
    const BASE = window.UitAPI && window.UitAPI.backendUrl;
    if (!BASE) return;
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    const headers = t ? {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + t
    } : {
      'Content-Type': 'application/json',
      'X-User-Id': user && user.id
    };
    fetch(`${BASE}/api/v1/orders/merchant/orders?merchant_id=${merchantId}`, {
      headers
    }).then(r => r.json()).then(d => {
      if (d && Array.isArray(d.data)) {
        setOrders(d.data);
      }
    }).catch(e => console.error("Error loading merchant orders in dashboard:", e));
  }, [merchantId, user, isMerchant]);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length;
  const SECTION_TITLES = {
    dash: 'Tổng quan',
    orders: 'Đơn hàng',
    products: 'Sản phẩm',
    promo: 'Khuyến mãi',
    analytics: 'Phân tích bán hàng',
    finance: 'Tài chính · Thanh toán',
    security: 'Bảo mật shop',
    settings: 'Cài đặt'
  };

  // Delegate render to section component (loaded via separate script tags)
  const renderSection = () => {
    const props = {
      merchantId,
      user
    };
    const map = {
      orders: window.MerchantOrdersSection,
      products: window.MerchantProductsSection,
      finance: window.MerchantFinanceSection,
      security: window.MerchantSecuritySection,
      analytics: window.MerchantAnalyticsSection,
      promo: window.MerchantPromoSection,
      settings: window.MerchantSettingsSection
    };
    const Comp = map[activeSection];
    if (Comp) return React.createElement(Comp, props);
    return /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 40,
        textAlign: 'center',
        color: 'var(--ink-500)'
      }
    }, "Section \u0111ang \u0111\u01B0\u1EE3c ph\xE1t tri\u1EC3n...");
  };

  // Dynamic KPIs calculations
  const productsCount = (window.PRODUCTS || []).filter(p => p.merchant_id === merchantId).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 1);
  const todayRevenue = orders.filter(o => {
    if (o.status === 'cancelled') return false;
    const oDate = new Date(o.created_at || new Date());
    return oDate >= today && oDate < nextDay;
  }).reduce((sum, o) => sum + o.total_amount, 0);
  const stats = [{
    label: 'Doanh thu hôm nay',
    value: todayRevenue.toLocaleString('vi-VN') + 'đ',
    delta: 'Cập nhật',
    positive: true,
    icon: 'wallet'
  }, {
    label: 'Đơn hàng',
    value: orders.length.toString(),
    delta: pendingCount > 0 ? `${pendingCount} chờ duyệt` : 'Đã xử lý',
    positive: pendingCount === 0,
    icon: 'package'
  }, {
    label: 'Sản phẩm đang bán',
    value: productsCount.toString(),
    delta: 'Đang hoạt động',
    positive: true,
    icon: 'tag'
  }];

  // Dynamic Chart calculations
  const getRevenueLast7Days = () => {
    const data = [];
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      d.setHours(0, 0, 0, 0);
      const endD = new Date(d);
      endD.setDate(d.getDate() + 1);
      const dayRev = orders.filter(o => {
        if (o.status === 'cancelled') return false;
        const oDate = new Date(o.created_at || new Date());
        return oDate >= d && oDate < endD;
      }).reduce((sum, o) => sum + o.total_amount, 0);
      data.push({
        d: dayName,
        realAmount: dayRev
      });
    }
    const maxRev = Math.max(...data.map(i => i.realAmount), 1);
    return data.map(item => ({
      d: item.d,
      v: Math.round(item.realAmount / maxRev * 100),
      realAmount: item.realAmount
    }));
  };
  const chartData = getRevenueLast7Days();
  if (!user) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 520,
        margin: '60px auto',
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 32,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 40,
      color: "var(--ink-400)"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        fontWeight: 600,
        margin: '12px 0 8px'
      }
    }, "C\u1EA7n \u0111\u0103ng nh\u1EADp ng\u01B0\u1EDDi b\xE1n"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--ink-600)',
        marginBottom: 20,
        lineHeight: 1.6
      }
    }, "Seller Center ch\u1EC9 hi\u1EC3n th\u1ECB d\u1EEF li\u1EC7u t\u1EEB backend sau khi \u0111\u0103ng nh\u1EADp."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.UitAuth && window.UitAuth.loginRedirect(),
      className: "btn btn-outline",
      style: {
        padding: '10px 24px'
      }
    }, "\u0110\u0103ng nh\u1EADp"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav('home'),
      className: "btn btn-outline",
      style: {
        padding: '10px 24px'
      }
    }, "V\u1EC1 trang mua s\u1EAFm"))));
  }
  if (!merchantChecked) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 520,
        margin: '60px auto',
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 32,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "spinner",
      style: {
        margin: '0 auto 16px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        fontWeight: 600,
        marginBottom: 8
      }
    }, "\u0110ang ki\u1EC3m tra tr\u1EA1ng th\xE1i ng\u01B0\u1EDDi b\xE1n"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--ink-600)',
        lineHeight: 1.6
      }
    }, "H\u1EC7 th\u1ED1ng \u0111ang x\xE1c nh\u1EADn c\u1EEDa h\xE0ng g\u1EAFn v\u1EDBi t\xE0i kho\u1EA3n hi\u1EC7n t\u1EA1i.")));
  }
  if (regSuccess) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 520,
        margin: '60px auto',
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 40,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: '#DEF7EC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 18px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check-circle",
      size: 40,
      color: "#10B981",
      stroke: 3
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 600,
        marginBottom: 12,
        color: '#10B981'
      }
    }, "\u0110\u0103ng k\xFD th\xE0nh c\xF4ng!"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: 'var(--ink-600)',
        lineHeight: 1.6
      }
    }, "C\u1EEDa h\xE0ng ", /*#__PURE__*/React.createElement("b", null, regShopName), " \u0111\xE3 \u0111\u01B0\u1EE3c t\u1EA1o tr\xEAn h\u1EC7 th\u1ED1ng.", /*#__PURE__*/React.createElement("br", null), "H\u1EC7 th\u1ED1ng \u0111ang chu\u1EA9n b\u1ECB chuy\u1EC3n h\u01B0\u1EDBng b\u1EA1n \u0111\u1EBFn Dashboard...")));
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
      window.UitAPI.merchant.register({
        name: nameVal,
        code: codeVal
      }).then(res => {
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
      }).catch(err => {
        setRegError(err.message || 'Có lỗi xảy ra trong quá trình đăng ký.');
      }).finally(() => {
        setRegLoading(false);
      });
    };
    if (showRegForm) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          maxWidth: 520,
          margin: '60px auto',
          padding: '0 16px'
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "card",
        style: {
          padding: 32
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 22,
          fontWeight: 600,
          marginBottom: 6
        }
      }, "\u0110\u0103ng k\xFD K\xEAnh ng\u01B0\u1EDDi b\xE1n"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          color: 'var(--ink-600)',
          marginBottom: 20
        }
      }, "M\u1EDF r\u1ED9ng kinh doanh c\u1EE7a b\u1EA1n b\u1EB1ng c\xE1ch t\u1EA1o m\u1ED9t c\u1EEDa h\xE0ng tr\xEAn h\u1EC7 th\u1ED1ng."), regError && /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '10px 12px',
          background: '#FEE2E2',
          border: '1px solid #FCA5A5',
          borderRadius: 6,
          fontSize: 12,
          color: '#B91C1C',
          marginBottom: 16
        }
      }, regError), /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 14
        }
      }, /*#__PURE__*/React.createElement("label", {
        style: {
          fontSize: 12,
          color: 'var(--ink-600)',
          marginBottom: 6,
          display: 'block'
        }
      }, "T\xEAn c\u1EEDa h\xE0ng (Shop Name)"), /*#__PURE__*/React.createElement("input", {
        className: "input",
        value: regShopName,
        onChange: e => {
          setRegShopName(e.target.value);
          if (regShopCode === '') {
            setRegShopCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''));
          }
        },
        placeholder: "Tech World, Ti\u1EC7m S\xE1ch Nh\u1ECF...",
        disabled: regLoading
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 20
        }
      }, /*#__PURE__*/React.createElement("label", {
        style: {
          fontSize: 12,
          color: 'var(--ink-600)',
          marginBottom: 6,
          display: 'block'
        }
      }, "M\xE3 \u0111\u1ECBnh danh (Shop Code / Slug)"), /*#__PURE__*/React.createElement("input", {
        className: "input",
        value: regShopCode,
        onChange: e => setRegShopCode(e.target.value),
        placeholder: "techworld, tiem-sach-nho",
        disabled: regLoading
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: 'var(--ink-500)',
          marginTop: 4
        }
      }, "D\xF9ng l\xE0m URL \u0111\u1ECBnh danh cho c\u1EEDa h\xE0ng. Ch\u1EC9 g\u1ED3m ch\u1EEF th\u01B0\u1EDDng, s\u1ED1 v\xE0 g\u1EA1ch ngang.")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: handleRegisterSubmit,
        disabled: regLoading,
        className: "btn btn-primary",
        style: {
          flex: 1,
          padding: '10px 20px'
        }
      }, regLoading ? 'Đang xử lý...' : 'Xác nhận tạo Shop'), /*#__PURE__*/React.createElement("button", {
        onClick: () => setShowRegForm(false),
        disabled: regLoading,
        className: "btn btn-outline",
        style: {
          padding: '10px 20px'
        }
      }, "Quay l\u1EA1i"))));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 520,
        margin: '60px auto',
        padding: '0 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 32,
        textAlign: 'center',
        border: '1px solid #FCA5A5'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: '#FEE2E2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 18px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "shield-check",
      size: 40,
      color: "#EF4444"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        fontWeight: 600,
        margin: '12px 0 8px',
        color: '#B91C1C'
      }
    }, "B\u1EA1n ch\u01B0a c\xF3 c\u1EEDa h\xE0ng ng\u01B0\u1EDDi b\xE1n"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--ink-600)',
        marginBottom: 24,
        lineHeight: 1.6
      }
    }, "T\xE0i kho\u1EA3n ", /*#__PURE__*/React.createElement("b", null, user.email || user.name), " \u0111ang l\xE0 t\xE0i kho\u1EA3n mua h\xE0ng. H\xE3y t\u1EA1o c\u1EEDa h\xE0ng \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u b\xE1n s\u1EA3n ph\u1EA9m tr\xEAn UIT Store."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowRegForm(true),
      className: "btn btn-primary",
      style: {
        padding: '12px 24px',
        fontWeight: 600
      }
    }, "\u0110\u0103ng k\xFD l\xE0m Ng\u01B0\u1EDDi b\xE1n ngay"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => window.UitAuth && window.UitAuth.logout(),
      className: "btn btn-outline",
      style: {
        flex: 1,
        padding: '10px 20px'
      }
    }, "\u0110\u0103ng nh\u1EADp t\xE0i kho\u1EA3n kh\xE1c"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav('home'),
      className: "btn btn-outline",
      style: {
        flex: 1,
        padding: '10px 20px'
      }
    }, "V\u1EC1 trang mua s\u1EAFm")))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "merchant-container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "merchant-sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 16px',
      borderBottom: '1px solid var(--ink-100)',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "SELLER CENTER"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14
    }
  }, shopName), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginTop: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge badge-success",
    style: {
      fontSize: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check-circle",
    size: 10
  }), " Mall"), /*#__PURE__*/React.createElement("span", {
    className: "badge badge-primary",
    style: {
      fontSize: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "key",
    size: 10
  }), " Keycloak")), user && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 10,
      color: 'var(--ink-500)',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 10,
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'monospace'
    }
  }, user.email))), [{
    id: 'dash',
    icon: 'dashboard',
    label: 'Tổng quan'
  }, {
    id: 'orders',
    icon: 'package',
    label: 'Đơn hàng',
    count: pendingCount
  }, {
    id: 'products',
    icon: 'tag',
    label: 'Sản phẩm'
  }, {
    id: 'promo',
    icon: 'gift',
    label: 'Khuyến mãi'
  }, {
    id: 'analytics',
    icon: 'eye',
    label: 'Phân tích bán hàng'
  }, {
    id: 'finance',
    icon: 'wallet',
    label: 'Tài chính · Thanh toán'
  }, {
    id: 'security',
    icon: 'shield-check',
    label: 'Bảo mật shop'
  }, {
    id: 'settings',
    icon: 'lock',
    label: 'Cài đặt'
  }].map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    onClick: () => setActiveSection(item.id),
    style: {
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 13,
      color: activeSection === item.id ? 'var(--primary)' : 'var(--ink-700)',
      background: activeSection === item.id ? 'var(--primary-tint)' : 'transparent',
      borderLeft: `3px solid ${activeSection === item.id ? 'var(--primary)' : 'transparent'}`,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), typeof item.count === 'number' && item.count > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: '1px 5px',
      background: 'var(--price)',
      color: 'white',
      borderRadius: 8,
      fontWeight: 600
    }
  }, item.count)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 24,
      background: 'var(--bg)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
      flexWrap: 'wrap',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 22,
      fontWeight: 600
    }
  }, SECTION_TITLES[activeSection] || activeSection), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-600)',
      marginTop: 2
    }
  }, "Ch\xE0o m\u1EEBng tr\u1EDF l\u1EA1i! H\xF4m nay l\xE0 ", ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date().getDay()], ", ", new Date().getDate(), "/", new Date().getMonth() + 1, "/", new Date().getFullYear())), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: '8px 16px',
      fontSize: 13
    },
    onClick: () => setActiveSection('products')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " Th\xEAm s\u1EA3n ph\u1EA9m"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('home'),
    className: "btn btn-ghost",
    style: {
      padding: '8px 16px',
      fontSize: 13,
      border: '1px solid var(--ink-200)'
    }
  }, "\u2190 V\u1EC1 trang mua s\u1EAFm"))), activeSection !== 'dash' && renderSection(), activeSection === 'dash' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16,
      marginBottom: 18,
      background: 'linear-gradient(90deg, #E8F7EE, #F0FAF3)',
      border: '1px solid #BDE5CA',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 28,
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "Shop c\u1EE7a b\u1EA1n \u0111ang b\u1EA3o m\u1EADt \u1EDF m\u1EE9c cao"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginTop: 2
    }
  }, "MFA v\xE0 API key \u0111\u01B0\u1EE3c qu\u1EA3n l\xFD b\u1EDFi Keycloak/backend. Email/phone: ", /*#__PURE__*/React.createElement("b", null, "field-encrypted"), " qua Vault Transit")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: '6px 14px',
      fontSize: 12
    },
    onClick: () => setActiveSection('security')
  }, "Xem chi ti\u1EBFt \u2192")), /*#__PURE__*/React.createElement("div", {
    className: "merchant-kpi-grid"
  }, stats.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)'
    }
  }, s.label), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 6,
      background: 'var(--primary-tint)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 14,
    color: "var(--primary)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700
    }
  }, s.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      marginTop: 4,
      color: s.positive ? 'var(--success)' : 'var(--warn)'
    }
  }, s.delta, " so v\u1EDBi h\xF4m qua")))), /*#__PURE__*/React.createElement("div", {
    className: "merchant-chart-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
      flexWrap: 'wrap',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600
    }
  }, "Doanh thu 7 ng\xE0y qua")), chartData.every(b => b.realAmount === 0) ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 48,
      color: 'var(--ink-400)',
      fontSize: 12
    }
  }, "Ch\u01B0a c\xF3 doanh thu t\u1EEB backend.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 14,
      height: 180,
      padding: '0 4px',
      overflowX: 'auto'
    }
  }, chartData.map(b => /*#__PURE__*/React.createElement("div", {
    key: b.d,
    style: {
      flex: 1,
      minWidth: 32,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--ink-600)',
      fontWeight: 600
    }
  }, b.realAmount.toLocaleString('vi-VN')), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 40,
      height: `${Math.max(b.v * 1.4, 4)}px`,
      background: 'var(--primary-soft)',
      borderRadius: '4px 4px 0 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-600)'
    }
  }, b.d))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 14px',
      fontSize: 14,
      fontWeight: 600
    }
  }, "C\u1EA7n x\u1EED l\xFD ngay"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, [{
    n: pendingCount,
    l: 'Đơn chờ xác nhận',
    c: 'var(--warn)',
    i: 'package',
    section: 'orders'
  }, {
    n: confirmedCount,
    l: 'Đơn cần đóng gói',
    c: 'var(--primary)',
    i: 'gift',
    section: 'orders'
  }].filter(t => t.n > 0).map(t => /*#__PURE__*/React.createElement("div", {
    key: t.l,
    onClick: () => setActiveSection(t.section),
    style: {
      padding: '10px 12px',
      borderRadius: 6,
      background: 'var(--ink-100)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 6,
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: t.c,
      fontWeight: 700,
      fontSize: 13
    }
  }, t.n), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 12
    }
  }, t.l), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 12,
    color: "var(--ink-400)"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600
    }
  }, "S\u1EA3n ph\u1EA9m t\u1EEB catalog"), /*#__PURE__*/React.createElement("button", {
    style: {
      color: 'var(--primary)',
      fontSize: 12,
      fontWeight: 500
    },
    onClick: () => setActiveSection('products')
  }, "Xem t\u1EA5t c\u1EA3 \u2192")), /*#__PURE__*/React.createElement("div", {
    className: "table-responsive"
  }, /*#__PURE__*/React.createElement("div", {
    className: "table-min-width"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '60px 2.5fr 1fr 1fr 1fr 0.8fr 1fr',
      gap: 12,
      alignItems: 'center',
      padding: '8px 12px',
      background: 'var(--ink-100)',
      borderRadius: 6,
      fontSize: 11,
      color: 'var(--ink-600)',
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null, "S\u1EA3n ph\u1EA9m"), /*#__PURE__*/React.createElement("span", null, "SKU"), /*#__PURE__*/React.createElement("span", null, "Gi\xE1"), /*#__PURE__*/React.createElement("span", null, "\u0110\xE3 b\xE1n"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center'
    }
  }, "T\u1ED3n"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center'
    }
  }, "Tr\u1EA1ng th\xE1i")), products.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    style: {
      display: 'grid',
      gridTemplateColumns: '60px 2.5fr 1fr 1fr 1fr 0.8fr 1fr',
      gap: 12,
      alignItems: 'center',
      padding: '12px',
      borderBottom: '1px solid var(--ink-100)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ph-img",
    style: {
      width: 44,
      height: 44,
      borderRadius: 4,
      fontSize: 9
    }
  }, p.brand), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      lineHeight: 1.35,
      display: '-webkit-box',
      WebkitLineClamp: 1,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-500)',
      marginTop: 2
    }
  }, p.brand)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      color: 'var(--ink-600)'
    }
  }, p.sku), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: 'var(--price)'
    }
  }, window.formatVND(p.base_price)), /*#__PURE__*/React.createElement("span", null, typeof p.sold === 'number' ? p.sold.toLocaleString('vi-VN') : '—'), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center'
    }
  }, typeof p.stock === 'number' ? p.stock : '—'), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, p.is_active === false ? /*#__PURE__*/React.createElement("span", {
    className: "badge",
    style: {
      fontSize: 10,
      background: 'var(--ink-100)',
      color: 'var(--ink-500)'
    }
  }, "\u1EA8n") : /*#__PURE__*/React.createElement("span", {
    className: "badge badge-success",
    style: {
      fontSize: 10
    }
  }, "Active"))))))))));
};

// ─── Register Screen ────────────────────────────────────────────────
const RegisterScreen = ({
  onLogin,
  onNav
}) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [strength, setStrength] = React.useState(0); // 0-4

  const calcStrength = pw => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const handlePasswordChange = v => {
    setPassword(v);
    setStrength(calcStrength(v));
  };
  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Tốt', 'Mạnh'];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu không khớp.');
      return;
    }
    setLoading(true);
    try {
      const parts = name.trim().split(' ');
      const firstName = parts.slice(0, -1).join(' ') || parts[0];
      const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
      const backendUrl = window.UitAPI ? window.UitAPI.backendUrl : window.location.origin;
      const res = await fetch(`${backendUrl}/api/v1/catalog/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim(),
          password
        })
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
        if (result.ok) {
          onLogin(result.user);
          return;
        }
      }
      // Fallback: chuyển sang trang đăng nhập
      onNav('login');
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    }
    setLoading(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "login-container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-visual"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--primary)',
      fontWeight: 800,
      fontSize: 16
    }
  }, "UIT"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16
    }
  }, "UIT Store")), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 26,
      lineHeight: 1.25,
      margin: '0 0 12px',
      letterSpacing: '-0.01em'
    }
  }, "T\u1EA1o t\xE0i kho\u1EA3n", /*#__PURE__*/React.createElement("br", null), "UIT Store"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: 0.9,
      lineHeight: 1.6,
      maxWidth: 340
    }
  }, "M\u1EADt kh\u1EA9u \u0111\u01B0\u1EE3c b\u1EA3o v\u1EC7 b\u1EB1ng ", /*#__PURE__*/React.createElement("b", null, "Argon2id"), " khi l\u01B0u tr\xEAn Keycloak.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, [{
    icon: 'shield-check',
    t: 'Mật khẩu không bao giờ lưu plain',
    s: 'Argon2id · per-user salt · server-side pepper'
  }, {
    icon: 'lock',
    t: 'Phiên đăng nhập JWT 5 phút',
    s: 'Refresh token rotation'
  }, {
    icon: 'check-circle',
    t: 'Đăng ký qua Keycloak',
    s: 'Không lưu tài khoản trong trình duyệt'
  }].map(f => /*#__PURE__*/React.createElement("div", {
    key: f.t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 6,
      background: 'rgba(255,255,255,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: f.icon,
    size: 16,
    color: "white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, f.t), /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: 0.85,
      fontSize: 11
    }
  }, f.s)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 36,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('login'),
    style: {
      color: 'var(--ink-500)',
      fontSize: 12,
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 12
  }), " Quay l\u1EA1i \u0111\u0103ng nh\u1EADp"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      marginBottom: 4
    }
  }, "T\u1EA1o t\xE0i kho\u1EA3n m\u1EDBi"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-600)',
      marginBottom: 22
    }
  }, "\u0110i\u1EC1n th\xF4ng tin \u0111\u1EC3 t\u1EA1o t\xE0i kho\u1EA3n UIT Store"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 6,
      display: 'block'
    }
  }, "H\u1ECD v\xE0 t\xEAn"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "Nguy\u1EC5n V\u0103n A",
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 6,
      display: 'block'
    }
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "email@example.com"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 6,
      display: 'block'
    }
  }, "M\u1EADt kh\u1EA9u"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "input",
    type: showPw ? 'text' : 'password',
    value: password,
    onChange: e => handlePasswordChange(e.target.value),
    placeholder: "T\u1ED1i thi\u1EC3u 8 k\xFD t\u1EF1",
    style: {
      paddingRight: 36
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      cursor: 'pointer'
    },
    onClick: () => setShowPw(!showPw)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 16,
    color: "var(--ink-400)"
  })))), password && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 4
    }
  }, [1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      background: i <= strength ? strengthColor[strength] : 'var(--ink-200)',
      transition: 'background 0.2s'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: strengthColor[strength]
    }
  }, "\u0110\u1ED9 m\u1EA1nh: ", strengthLabel[strength] || '')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 6,
      display: 'block'
    }
  }, "X\xE1c nh\u1EADn m\u1EADt kh\u1EA9u"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    type: "password",
    value: confirm,
    onChange: e => setConfirm(e.target.value),
    placeholder: "Nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u",
    style: {
      borderColor: confirm && confirm !== password ? '#EF4444' : undefined
    }
  }), confirm && confirm !== password && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#EF4444',
      marginTop: 4
    }
  }, "M\u1EADt kh\u1EA9u kh\xF4ng kh\u1EDBp")), error && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#FEE2E2',
      border: '1px solid #FCA5A5',
      borderRadius: 6,
      fontSize: 12,
      color: '#B91C1C',
      marginBottom: 14
    }
  }, error), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: loading,
    className: "btn btn-primary",
    style: {
      width: '100%',
      padding: 12,
      opacity: loading ? 0.7 : 1
    }
  }, loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      fontSize: 13,
      color: 'var(--ink-600)',
      textAlign: 'center'
    }
  }, "\u0110\xE3 c\xF3 t\xE0i kho\u1EA3n?", ' ', /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--primary)',
      fontWeight: 500,
      cursor: 'pointer'
    },
    onClick: () => onNav('login')
  }, "\u0110\u0103ng nh\u1EADp")))));
};

// ─── Account Screen ──────────────────────────────────────────────────
const AccountScreen = ({
  user,
  onNav,
  onLogout
}) => {
  if (!user) {
    onNav('login');
    return null;
  }
  const roles = (user.roles || []).filter(r => !['default-roles-nt219', 'offline_access', 'uma_authorization'].includes(r));
  const isAdmin = roles.includes('admin');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 520,
      margin: '40px auto',
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 28,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: 'var(--primary)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 26,
      fontWeight: 700,
      flexShrink: 0
    }
  }, user.initial), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600
    }
  }, user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-600)',
      marginTop: 2
    }
  }, user.email), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 6,
      flexWrap: 'wrap'
    }
  }, roles.length > 0 ? roles.map(r => /*#__PURE__*/React.createElement("span", {
    key: r,
    className: "badge badge-primary",
    style: {
      fontSize: 11
    }
  }, r)) : /*#__PURE__*/React.createElement("span", {
    className: "badge",
    style: {
      fontSize: 11,
      background: 'var(--ink-100)',
      color: 'var(--ink-600)'
    }
  }, "user")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('orders'),
    className: "btn btn-outline",
    style: {
      width: '100%',
      padding: '11px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      justifyContent: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "package",
    size: 18
  }), " \u0110\u01A1n h\xE0ng c\u1EE7a t\xF4i"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('merchant'),
    className: "btn btn-outline",
    style: {
      width: '100%',
      padding: '11px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      justifyContent: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dashboard",
    size: 18
  }), " K\xEAnh ng\u01B0\u1EDDi b\xE1n"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (window.UitAuth) window.location.href = window.UitAuth.issuer + '/account';
    },
    className: "btn btn-outline",
    style: {
      width: '100%',
      padding: '11px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      justifyContent: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 18
  }), " \u0110\u1ED5i m\u1EADt kh\u1EA9u / B\u1EA3o m\u1EADt"), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    style: {
      width: '100%',
      padding: '11px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      justifyContent: 'flex-start',
      color: '#EF4444',
      border: '1px solid #FCA5A5',
      borderRadius: 6,
      background: 'white'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 18
  }), " \u0110\u0103ng xu\u1EA5t"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      marginBottom: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "key",
    size: 14,
    color: "var(--primary)"
  }), " Phi\xEAn \u0111\u0103ng nh\u1EADp JWT"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      color: 'var(--ink-600)',
      lineHeight: 1.8
    }
  }, /*#__PURE__*/React.createElement("div", null, "sub: ", user.id || '—'), /*#__PURE__*/React.createElement("div", null, "iss: ", window.UitAuth && window.UitAuth.issuer || '—'), /*#__PURE__*/React.createElement("div", null, "exp: access_token TTL = 300s \xB7 refresh rotation \u2713"), /*#__PURE__*/React.createElement("div", null, "alg: RS256 (Keycloak)"))));
};
Object.assign(window, {
  LoginScreen,
  RegisterScreen,
  AccountScreen,
  MerchantScreen
});
