// UIT Store — OAuth2 Authorization Code + PKCE
// Keycloak realm: nt219, client: frontend-spa
// Spec: RFC 7636 (PKCE), RFC 6749, OpenID Connect Core 1.0

(function () {
  const REALM     = 'nt219';
  const CLIENT_ID = 'frontend-spa';

  // Auth base URL: /auth/* được Nginx proxy sang Keycloak:8080
  // Override qua ?authUrl=http://<NODE1_IP>/auth để test cross-origin
  function resolveAuthBase() {
    try {
      const p = new URLSearchParams(window.location.search);
      const override = p.get('authUrl') || p.get('auth_url');
      if (override) return override.replace(/\/+$/, '');
    } catch (e) {}
    return window.location.origin + '/auth';
  }

  const AUTH_BASE        = resolveAuthBase();
  const ISSUER           = AUTH_BASE + '/realms/' + REALM;
  const AUTH_EP          = ISSUER + '/protocol/openid-connect/auth';
  const TOKEN_EP         = ISSUER + '/protocol/openid-connect/token';
  const LOGOUT_EP        = ISSUER + '/protocol/openid-connect/logout';
  const REGISTER_EP      = ISSUER + '/protocol/openid-connect/registrations';
  const REDIRECT_URI     = window.location.origin + '/';

  // sessionStorage keys
  var K = {
    ACCESS:   'nt219_access_token',
    REFRESH:  'nt219_refresh_token',
    EXP_AT:   'nt219_expires_at',
    VERIFIER: 'nt219_pkce_verifier',
    STATE:    'nt219_oauth_state',
    USER:     'nt219_user',
  };

  // ── PKCE helpers ──────────────────────────────────────────────────────

  function randomBase64url(byteCount) {
    var arr = new Uint8Array(byteCount);
    crypto.getRandomValues(arr);
    var str = '';
    for (var i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function generateVerifier() {
    // 96 random bytes → 128-char base64url string (within 43-128 range per RFC 7636)
    return randomBase64url(96);
  }

  async function generateChallenge(verifier) {
    var encoded = new TextEncoder().encode(verifier);
    var hash = await crypto.subtle.digest('SHA-256', encoded);
    return randomBase64url(0).replace(/./g, '') + // trick: use same encoder
      btoa(String.fromCharCode.apply(null, new Uint8Array(hash)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ── Token storage (sessionStorage — cleared on tab close) ─────────────

  function ss(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem(key);
      if (val === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  function saveTokens(resp) {
    ss(K.ACCESS,  resp.access_token || null);
    ss(K.REFRESH, resp.refresh_token || null);
    var exp = Date.now() + ((resp.expires_in || 300) - 10) * 1000;
    ss(K.EXP_AT, String(exp));
    // Parse user claims from JWT payload — display only, never used for authZ
    try {
      var parts  = (resp.access_token || '').split('.');
      // base64url → base64: đổi ký tự rồi thêm padding cho đúng bội số 4
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      b64 += '='.repeat((4 - b64.length % 4) % 4);
      var claims = JSON.parse(atob(b64));
      ss(K.USER, JSON.stringify({
        id:      claims.sub  || '',
        name:    claims.name || claims.preferred_username || 'Người dùng',
        email:   claims.email || '',
        initial: (claims.name || claims.preferred_username || '?')[0].toUpperCase(),
        roles:   (claims.realm_access && claims.realm_access.roles) || [],
      }));
    } catch (e) {}
  }

  function clearTokens() {
    Object.values(K).forEach(function (k) { ss(k, null); });
  }

  function getAccessToken()  { return ss(K.ACCESS)  || null; }
  function getRefreshToken() { return ss(K.REFRESH) || null; }
  function isExpired() {
    var exp = parseInt(ss(K.EXP_AT) || '0', 10);
    return Date.now() >= exp;
  }
  function getUser() {
    try { var r = ss(K.USER); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function isAuthenticated() { return !!getAccessToken() && !isExpired(); }

  // ── Token refresh ─────────────────────────────────────────────────────

  async function refreshAccessToken() {
    var refresh = getRefreshToken();
    if (!refresh) return false;
    try {
      var body = new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refresh,
        client_id:     CLIENT_ID,
      });
      var res = await fetch(TOKEN_EP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) { clearTokens(); return false; }
      saveTokens(await res.json());
      return true;
    } catch (e) { return false; }
  }

  // Returns a valid access token, auto-refreshing if expired
  async function getValidToken() {
    if (!getAccessToken()) return null;
    if (isExpired()) {
      var ok = await refreshAccessToken();
      if (!ok) return null;
    }
    return getAccessToken();
  }

  // ── Build and execute redirect ─────────────────────────────────────────

  async function startFlow(endpoint) {
    var verifier   = generateVerifier();
    var challenge  = await generateChallenge(verifier);
    var state      = randomBase64url(16);
    ss(K.VERIFIER, verifier);
    ss(K.STATE,    state);

    var params = new URLSearchParams({
      response_type:         'code',
      client_id:             CLIENT_ID,
      redirect_uri:          REDIRECT_URI,
      scope:                 'openid email profile',
      state:                 state,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
    });
    window.location.href = endpoint + '?' + params.toString();
  }

  function login()    { return startFlow(AUTH_EP); }
  function register() { return startFlow(REGISTER_EP); }

  function logout() {
    var token = getAccessToken();
    var isMock = token && token.endsWith('.mock_signature');
    clearTokens();
    if (isMock) return; // mock mode: chỉ xóa token, app.jsx tự nav('home')
    var params = new URLSearchParams({
      client_id:                CLIENT_ID,
      post_logout_redirect_uri: REDIRECT_URI,
    });
    if (token) params.set('id_token_hint', token);
    window.location.href = LOGOUT_EP + '?' + params.toString();
  }

  // ── OAuth2 callback handler ───────────────────────────────────────────
  // Call once on app startup. Returns user object on successful code exchange,
  // null on normal page load, throws on tampered state.

  async function handleCallback() {
    var params = new URLSearchParams(window.location.search);
    var code   = params.get('code');
    var state  = params.get('state');
    var error  = params.get('error');

    // Always clean the URL so the code is never reused
    if (code || error) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (error) {
      console.warn('[UitAuth] Keycloak error:', error, params.get('error_description'));
      return null;
    }
    if (!code) return null; // Normal page load

    // CSRF check — compare state param with what we stored before redirect
    var savedState = ss(K.STATE);
    if (state && savedState && state !== savedState) {
      console.error('[UitAuth] State mismatch — possible CSRF. Auth aborted.');
      clearTokens();
      return null;
    }

    var verifier = ss(K.VERIFIER);
    ss(K.VERIFIER, null);
    ss(K.STATE,    null);

    if (!verifier) {
      console.error('[UitAuth] No code_verifier — cannot exchange code.');
      return null;
    }

    // Exchange auth code for tokens
    try {
      var body = new URLSearchParams({
        grant_type:    'authorization_code',
        code:          code,
        redirect_uri:  REDIRECT_URI,
        client_id:     CLIENT_ID,
        code_verifier: verifier,
      });
      var res = await fetch(TOKEN_EP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) {
        var err = await res.json().catch(function () { return {}; });
        console.error('[UitAuth] Token exchange failed:', err);
        return null;
      }
      saveTokens(await res.json());
      return getUser();
    } catch (e) {
      console.error('[UitAuth] Token exchange error:', e);
      return null;
    }
  }

  // ── Mock store — demo khi Keycloak chưa chạy ─────────────────────────
  // Lưu user vào localStorage với password hash SHA-256.
  // Tự động bị bỏ qua khi Keycloak hoạt động bình thường.

  var MOCK_STORE_KEY = 'nt219_mock_users';

  function getMockUsers() {
    try { return JSON.parse(localStorage.getItem(MOCK_STORE_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveMockUsers(users) {
    try { localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(users)); } catch (e) {}
  }

  async function sha256hex(str) {
    var buf  = new TextEncoder().encode(str);
    var hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  // Tạo JWT-like mock token (base64url, không ký — chỉ để demo)
  function makeMockToken(user, expiresInSeconds) {
    var now     = Math.floor(Date.now() / 1000);
    var header  = { alg: 'none', typ: 'JWT' };
    var payload = {
      sub:               user.id,
      name:              user.name,
      email:             user.email,
      preferred_username: user.email,
      realm_access:      { roles: ['user'] },
      iat:               now,
      exp:               now + expiresInSeconds,
      iss:               'mock://nt219-demo',
    };
    function b64(obj) {
      return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return b64(header) + '.' + b64(payload) + '.mock_signature';
  }

  function saveMockSession(user) {
    var expiresIn = 300;
    var token = makeMockToken(user, expiresIn);
    try {
      ss(K.ACCESS,  token);
      ss(K.REFRESH, '');
      ss(K.EXP_AT,  String(Date.now() + (expiresIn - 10) * 1000));
      // Ghi thẳng — không qua atob để tránh lỗi padding base64url
      ss(K.USER, JSON.stringify({
        id:      user.id,
        name:    user.name,
        email:   user.email,
        initial: user.initial,
        roles:   ['user'],
      }));
    } catch (e) {}
  }

  // Đăng ký user mới vào mock store
  // Trả về: { ok: true } | { ok: false, error }
  async function registerMock(name, email, password) {
    var users = getMockUsers();
    if (users.find(function (u) { return u.email === email; })) {
      return { ok: false, error: 'Email này đã được đăng ký' };
    }
    var hash = await sha256hex(password);
    var user = {
      id:      'mock_' + Date.now(),
      name:    name,
      email:   email,
      initial: name.trim()[0].toUpperCase(),
      hash:    hash,
    };
    users.push(user);
    saveMockUsers(users);
    saveMockSession(user);
    return { ok: true, user: getUser() };
  }

  // ── ROPC — thử Keycloak, fallback mock nếu không có mạng ─────────────
  // username: email, otp: mã TOTP 6 số (tuỳ chọn)
  // Trả về: { ok: true, user, mode } | { ok: false, error, mfaRequired }
  async function loginWithPassword(username, password, otp) {
    var params = {
      grant_type: 'password',
      client_id:  'test-cli',
      username:   username,
      password:   password,
      scope:      'openid email profile',
    };
    if (otp) params.totp = otp;

    // 1. Thử Keycloak trước
    try {
      var res = await fetch(TOKEN_EP, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams(params).toString(),
        // Timeout ngắn để không đợi lâu khi Keycloak chưa chạy
        signal:  AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
      });
      var data = await res.json();

      if (res.ok) {
        saveTokens(data);
        return { ok: true, user: getUser(), mode: 'keycloak' };
      }

      var desc = data.error_description || data.error || 'Đăng nhập thất bại';
      var mfaRequired = desc.toLowerCase().includes('otp') ||
                        desc.toLowerCase().includes('totp') ||
                        desc.toLowerCase().includes('authenticator');
      // Keycloak đang chạy nhưng sai mật khẩu → không fallback mock
      return { ok: false, error: desc, mfaRequired: mfaRequired };

    } catch (networkErr) {
      // Keycloak chưa chạy (network error / timeout) → thử mock store
    }

    // 2. Fallback: mock store trong localStorage
    var users = getMockUsers();
    var found = users.find(function (u) { return u.email === username; });
    if (!found) {
      return { ok: false, error: '[Demo] Email chưa đăng ký trong mock store' };
    }
    var hash = await sha256hex(password);
    if (found.hash !== hash) {
      return { ok: false, error: '[Demo] Sai mật khẩu' };
    }
    saveMockSession(found);
    return { ok: true, user: getUser(), mode: 'mock' };
  }

  // ── Pre-seed tài khoản merchant demo ────────────────────────────────
  // Tự động thêm 2 tài khoản cố định khi mock store trống/thiếu.
  // Dùng để demo "kênh người bán" với owner_id khớp MERCHANTS trong data.js.
  async function seedDemoAccounts() {
    var users = getMockUsers();
    var seeds = [
      { id: 'user_demo_001', name: 'TechWorld Merchant', email: 'merchant@uitstore.vn', initial: 'T' },
      { id: 'user_tiki_001', name: 'Tiki Electronics',   email: 'tiki@uitstore.vn',     initial: 'T' },
    ];
    var changed = false;
    for (var i = 0; i < seeds.length; i++) {
      var s = seeds[i];
      if (!users.find(function(u) { return u.id === s.id; })) {
        var hash = await sha256hex('demo123');
        users.push({ id: s.id, name: s.name, email: s.email, initial: s.initial, hash: hash });
        changed = true;
      }
    }
    if (changed) saveMockUsers(users);
  }
  seedDemoAccounts();

  window.UitAuth = {
    authBase:           AUTH_BASE,
    issuer:             ISSUER,
    loginWithPassword:  loginWithPassword,
    registerMock:       registerMock,
    seedDemoAccounts:   seedDemoAccounts,
    loginRedirect:      login,
    register:           register,
    logout:             logout,
    handleCallback:     handleCallback,
    getAccessToken:     getAccessToken,
    getValidToken:      getValidToken,
    getUser:            getUser,
    isAuthenticated:    isAuthenticated,
    refreshToken:       refreshAccessToken,
    getMockUsers:       getMockUsers,
  };
})();
