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
      if (override) {
        const url = override.replace(/\/+$/, '');
        localStorage.setItem('UIT_AUTH_URL', url);
        return url;
      }
      const stored = localStorage.getItem('UIT_AUTH_URL');
      if (stored) return stored;
    } catch (e) {}
    
    // Tự động nhận diện Origin hiện tại (VD: https://abc.ngrok.io hoặc http://192.168.122.11)
    // Nếu đang chạy file local (file://), fallback về IP của máy ảo
    if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
      return 'http://192.168.122.11:8080/auth';
    }
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
    ID:       'nt219_id_token',
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

  function decodeBase64urlUtf8(value) {
    var b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    b64 += '='.repeat((4 - b64.length % 4) % 4);
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  function readClaims(token) {
    var parts = (token || '').split('.');
    if (parts.length < 2) return null;
    return JSON.parse(decodeBase64urlUtf8(parts[1]));
  }

  function userFromClaims(claims) {
    var displayName = claims.name || claims.preferred_username || 'Người dùng';
    return {
      id:      claims.sub || '',
      name:    displayName,
      email:   claims.email || '',
      initial: displayName[0].toUpperCase(),
      roles:   (claims.realm_access && claims.realm_access.roles) || [],
    };
  }

  function saveTokens(resp) {
    ss(K.ACCESS,  resp.access_token || null);
    ss(K.ID,      resp.id_token || ss(K.ID) || null);
    ss(K.REFRESH, resp.refresh_token || null);
    var exp = Date.now() + ((resp.expires_in || 300) - 10) * 1000;
    ss(K.EXP_AT, String(exp));
    // Parse user claims from JWT payload — display only, never used for authZ
    try {
      var claims = readClaims(resp.access_token);
      if (claims) ss(K.USER, JSON.stringify(userFromClaims(claims)));
    } catch (e) {}
  }

  function clearTokens() {
    Object.values(K).forEach(function (k) { ss(k, null); });
  }

  function getAccessToken()  { return ss(K.ACCESS)  || null; }
  function getIdToken()      { return ss(K.ID)      || null; }
  function getRefreshToken() { return ss(K.REFRESH) || null; }
  function isExpired() {
    var exp = parseInt(ss(K.EXP_AT) || '0', 10);
    return Date.now() >= exp;
  }
  function getUser() {
    try {
      var token = getAccessToken();
      if (token && !isExpired()) {
        var claims = readClaims(token);
        if (claims) {
          var user = userFromClaims(claims);
          ss(K.USER, JSON.stringify(user));
          return user;
        }
      }
      var r = ss(K.USER);
      return r ? JSON.parse(r) : null;
    } catch (e) { return null; }
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
    var idToken = getIdToken();
    clearTokens();
    var params = new URLSearchParams({
      client_id:                CLIENT_ID,
      post_logout_redirect_uri: REDIRECT_URI,
    });
    if (idToken) params.set('id_token_hint', idToken);
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

  window.UitAuth = {
    authBase:           AUTH_BASE,
    issuer:             ISSUER,
    loginRedirect:      login,
    register:           register,
    logout:             logout,
    handleCallback:     handleCallback,
    getAccessToken:     getAccessToken,
    getIdToken:         getIdToken,
    getValidToken:      getValidToken,
    getUser:            getUser,
    isAuthenticated:    isAuthenticated,
    refreshToken:       refreshAccessToken,
  };
})();
