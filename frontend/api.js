// UIT Store — Backend API client
// Chạy local với NODE-1 Nginx proxy sang Envoy:
//   http://localhost:3000/?api=http://<NODE1_IP>
const DEFAULT_BACKEND_URL = (window.location.protocol === 'file:' || window.location.hostname === 'localhost') ? 'http://192.168.122.11' : window.location.origin;
const LEGACY_BACKEND_URLS = ['http://192.168.122.11:10000'];

function normalizeBackendUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function readStoredBackendUrl() {
  try {
    return localStorage.getItem('UIT_BACKEND_URL');
  } catch (err) {
    return null;
  }
}

function storeBackendUrl(url) {
  try {
    localStorage.setItem('UIT_BACKEND_URL', url);
  } catch (err) {
    // Browser storage can be unavailable in private/file contexts.
  }
}

function resolveBackendUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('api') || params.get('backend') || params.get('baseUrl');
  if (fromQuery) {
    const url = normalizeBackendUrl(fromQuery);
    storeBackendUrl(url);
    return url;
  }

  const storedUrl = normalizeBackendUrl(readStoredBackendUrl());
  if (LEGACY_BACKEND_URLS.includes(storedUrl)) {
    storeBackendUrl(DEFAULT_BACKEND_URL);
    return DEFAULT_BACKEND_URL;
  }

  return normalizeBackendUrl(
    window.UIT_BACKEND_URL ||
    storedUrl ||
    DEFAULT_BACKEND_URL
  );
}

const BACKEND_URL = resolveBackendUrl();

(function () {
  const BASE = {
    CATALOG: BACKEND_URL + '/api/v1/catalog',
    CART:    BACKEND_URL + '/api/v1/cart',
    ORDER:   BACKEND_URL + '/api/v1/orders',
  };

  let _userId = null;

  function authHeaders(extra) {
    const token = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    const base = { 
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };
    if (token) {
      base['Authorization'] = 'Bearer ' + token;
    }
    return Object.assign(base, extra || {});
  }

  async function apiFetch(url, opts) {
    opts = opts || {};
    const finalOpts = Object.assign({ headers: authHeaders() }, opts);
    if (opts.headers) finalOpts.headers = Object.assign({}, authHeaders(), opts.headers);
    const res = await fetch(url, finalOpts);

    // Token hết hạn → thử refresh một lần rồi retry
    if (res.status === 401 && window.UitAuth && window.UitAuth.refreshToken) {
      const ok = await window.UitAuth.refreshToken();
      if (ok) {
        const retryOpts = Object.assign({}, finalOpts, { headers: authHeaders() });
        if (opts.headers) retryOpts.headers = Object.assign({}, authHeaders(), opts.headers);
        const retryRes = await fetch(url, retryOpts);
        const retryJson = await retryRes.json().catch(() => null);
        if (!retryRes.ok) {
          const msg = (retryJson && retryJson.error && retryJson.error.message) || ('HTTP ' + retryRes.status);
          const err = new Error(msg); err.status = retryRes.status; err.body = retryJson;
          throw err;
        }
        return retryJson;
      }
    }

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (json && json.error && json.error.message) || ('HTTP ' + res.status);
      const err = new Error(msg);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  }

  // ── Catalog Service ──────────────────────────────────────────────────
  const catalog = {
    listProducts: function (page, size) {
      return apiFetch(
        BASE.CATALOG + '/public/products?page=' + (page || 1) + '&size=' + (size || 50) + '&status=active'
      );
    },
    getProduct: function (id) {
      return apiFetch(BASE.CATALOG + '/public/products/' + id);
    },
  };

  // ── Cart Service ─────────────────────────────────────────────────────
  const cart = {
    list: function () {
      return apiFetch(BASE.CART + '/user/carts');
    },
    addItem: function (merchantId, item) {
      return apiFetch(BASE.CART + '/user/carts/' + merchantId + '/items', {
        method: 'POST',
        body: JSON.stringify(item),
      });
    },
    updateItem: function (merchantId, itemId, quantity, cartVersion) {
      return apiFetch(BASE.CART + '/user/carts/' + merchantId + '/items/' + itemId, {
        method: 'PUT',
        body: JSON.stringify({ quantity: quantity, cart_version: cartVersion }),
      });
    },
    removeItem: function (merchantId, itemId, cartVersion) {
      return apiFetch(
        BASE.CART + '/user/carts/' + merchantId + '/items/' + itemId + '?cart_version=' + cartVersion,
        { method: 'DELETE' }
      );
    },
    clearCart: function (merchantId, cartVersion) {
      return apiFetch(
        BASE.CART + '/user/carts/' + merchantId + '/items?cart_version=' + cartVersion,
        { method: 'DELETE' }
      );
    },
  };

  // ── Order Service ────────────────────────────────────────────────────
  const order = {
    checkout: function (payload, idempotencyKey) {
      return apiFetch(BASE.ORDER + '/user/orders/checkout', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
      });
    },
    list: function () {
      return apiFetch(BASE.ORDER + '/user/orders');
    },
    get: function (orderId) {
      return apiFetch(BASE.ORDER + '/user/orders/' + orderId);
    },
  };

  // Map API product response → window.PRODUCTS schema.
  function mapApiProduct(p) {
    return {
      id:             p.id,
      merchant_id:    p.merchant_id,
      sku:            p.sku,
      name:           p.name,
      brand:          p.brand || '',
      category:       p.metadata_json && p.metadata_json.category || 'other',
      base_price:     p.base_price,
      currency_code:  p.currency_code || 'VND',
      rating:         0,
      rating_count:   0,
      sold:           0,
      stock:          p.metadata_json && p.metadata_json.stock || 0,
      weight_g:       p.weight_grams || 0,
      warranty_months: 0,
      official:       false,
      color_options:  [],
      description:    p.metadata_json && p.metadata_json.description || '',
      specs:          {},
      images:         [],
    };
  }

  window.UitAPI = {
    backendUrl:     BACKEND_URL,
    endpoints:      BASE,
    setUserId:      function (id) { _userId = id; },
    getUserId:      function () { return _userId; },
    mapApiProduct:  mapApiProduct,
    catalog:        catalog,
    cart:           cart,
    order:          order,
  };
})();
