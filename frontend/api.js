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

function isLocalDevHost() {
  return window.location.protocol === 'file:' || window.location.hostname === 'localhost';
}

function isLabIngressHost(hostname) {
  return /^192\.168\.122\.\d+$/.test(hostname || '');
}

function resolveBackendUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('api') || params.get('backend') || params.get('baseUrl');
  if (fromQuery) {
    const url = normalizeBackendUrl(fromQuery);
    storeBackendUrl(url);
    return url;
  }

  if (window.UIT_BACKEND_URL) {
    return normalizeBackendUrl(window.UIT_BACKEND_URL);
  }

  const storedUrl = normalizeBackendUrl(readStoredBackendUrl());
  if (LEGACY_BACKEND_URLS.includes(storedUrl)) {
    storeBackendUrl(DEFAULT_BACKEND_URL);
    return DEFAULT_BACKEND_URL;
  }

  // VM ingress (NODE-1): API luôn cùng origin — tránh dùng URL tunnel cũ trong localStorage
  if (!isLocalDevHost() && isLabIngressHost(window.location.hostname)) {
    const originBackend = normalizeBackendUrl(window.location.origin);
    if (storedUrl && storedUrl !== originBackend) {
      storeBackendUrl(originBackend);
    }
    return originBackend;
  }

  return normalizeBackendUrl(storedUrl || DEFAULT_BACKEND_URL);
}

const BACKEND_URL = resolveBackendUrl();

(function () {
  const BASE = {
    CATALOG: BACKEND_URL + '/api/v1/catalog',
    CART:    BACKEND_URL + '/api/v1/cart',
    ORDER:   BACKEND_URL + '/api/v1/orders',
  };

  let _userId = null;

  function generateNonce() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  function authHeaders(extra) {
    const token = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    const base = { 
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
      'X-Nonce': generateNonce()
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
          const msg = getErrorMessage(retryJson, retryRes.status);
          const err = new Error(msg); err.status = retryRes.status; err.body = retryJson;
          throw err;
        }
        return retryJson;
      }
    }

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = getErrorMessage(json, res.status);
      const err = new Error(msg);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  }

  function getErrorMessage(json, status) {
    if (json && json.error && json.error.message) return json.error.message;
    if (json && typeof json.detail === 'string') return json.detail;
    if (json && Array.isArray(json.detail) && json.detail[0] && json.detail[0].msg) {
      return json.detail[0].msg;
    }
    if (json && typeof json.message === 'string') return json.message;
    if (status === 429) return 'Quá nhiều request (HTTP 429). Nginx/gateway đang giới hạn — thử lại sau 1 phút hoặc dùng IP nội bộ thay tunnel.';
    if (status === 502 || status === 503) {
      return 'HTTP ' + status + ' từ ' + BACKEND_URL
        + ' — Envoy/Nginx (NODE-1) không kết nối được catalog-service (NODE-2:8001).'
        + ' Trên NODE-1 chạy: curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/v1/catalog/public/products?size=1&status=active"';
    }
    if (status === 403 && json && json.error === 'blocked_by_waf') return 'Request bị WAF chặn: ' + (json.reason || 'unknown');
    return 'HTTP ' + status;
  }

  function mapCartItemRow(item) {
    return {
      productId: item.product_id,
      qty: item.quantity,
      itemId: item.id,
      merchantId: item.merchant_id,
      name: item.product_name_snapshot,
      unitPrice: item.unit_price_snapshot,
      imageUrl: item.image_url_snapshot,
    };
  }

  function productFromCartLine(c) {
    const fromCatalog = (window.PRODUCTS || []).find(function (p) { return p.id === c.productId; });
    if (fromCatalog) return fromCatalog;
    if (!c.name || c.unitPrice == null) return null;
    return {
      id: c.productId,
      merchant_id: c.merchantId || '',
      merchant_name: 'Nhà bán hàng UIT Store',
      sku: c.sku || '',
      name: c.name,
      brand: '',
      category: 'other',
      base_price: Number(c.unitPrice),
      currency_code: 'VND',
      rating: 0,
      rating_count: 0,
      sold: 0,
      stock: 0,
      weight_g: 0,
      warranty_months: 0,
      official: false,
      color_options: [],
      description: '',
      specs: {},
      images: c.imageUrl ? [{ url: c.imageUrl }] : [],
    };
  }

  function mergeCartSnapshotsIntoProducts(carts) {
    if (!carts || !carts.length) return;
    const byId = {};
    (window.PRODUCTS || []).forEach(function (p) { byId[p.id] = p; });
    carts.forEach(function (cartRow) {
      (cartRow.items || []).forEach(function (item) {
        if (byId[item.product_id]) return;
        const mapped = productFromCartLine(mapCartItemRow(item));
        if (mapped) byId[item.product_id] = mapped;
      });
    });
    window.PRODUCTS = Object.values(byId);
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

  // ── Merchant Service / Profile ─────────────────────────────────────────
  const merchant = {
    me: function () {
      return apiFetch(BACKEND_URL + '/api/v1/catalog/merchant/me');
    },
    register: function (payload) {
      return apiFetch(BACKEND_URL + '/api/v1/catalog/merchant/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  };

  function productImageUrl(product) {
    const imgs = product && product.images;
    if (!imgs || !imgs.length) return null;
    const first = imgs[0];
    if (typeof first === 'string') return first;
    return first.url || first.src || null;
  }

  // Map API product response → window.PRODUCTS schema.
  function mapApiProduct(p) {
    return {
      id:             p.id,
      merchant_id:    p.merchant_id,
      merchant_name:  p.merchant_name || p.shop_name || (p.metadata_json && (p.metadata_json.merchant_name || p.metadata_json.shop_name)) || 'Nhà bán hàng UIT Store',
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
      images:         Array.isArray(p.images) ? p.images : [],
    };
  }

  window.UitAPI = {
    backendUrl:     BACKEND_URL,
    endpoints:      BASE,
    lastCatalogError: null,
    setUserId:      function (id) { _userId = id; },
    getUserId:      function () { return _userId; },
    mapApiProduct:  mapApiProduct,
    productImageUrl: productImageUrl,
    mapCartItemRow: mapCartItemRow,
    productFromCartLine: productFromCartLine,
    mergeCartSnapshotsIntoProducts: mergeCartSnapshotsIntoProducts,
    catalog:        catalog,
    cart:           cart,
    order:          order,
    merchant:       merchant,
  };
})();
