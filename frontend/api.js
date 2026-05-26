// UIT Store — Backend API client
// Đổi BACKEND_URL thành IP/domain của NODE-1 (Envoy ingress) khi deploy
const BACKEND_URL = 'http://localhost:10000';

(function () {
  const BASE = {
    CATALOG: BACKEND_URL + '/api/v1/catalog',
    CART:    BACKEND_URL + '/api/v1/cart',
    ORDER:   BACKEND_URL + '/api/v1/orders',
  };

  let _userId = 'user_demo_001';

  function authHeaders(extra) {
    return Object.assign({ 'Content-Type': 'application/json', 'X-User-Id': _userId }, extra || {});
  }

  async function apiFetch(url, opts) {
    opts = opts || {};
    const finalOpts = Object.assign({ headers: authHeaders() }, opts);
    if (opts.headers) finalOpts.headers = Object.assign({}, authHeaders(), opts.headers);
    const res = await fetch(url, finalOpts);
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

  // Map API product response → window.PRODUCTS schema (supplement thiếu fields từ static)
  function mapApiProduct(p, staticFallback) {
    const s = staticFallback || {};
    return {
      id:             p.id,
      merchant_id:    p.merchant_id,
      sku:            p.sku,
      name:           p.name,
      brand:          p.brand || s.brand || '',
      category:       p.metadata_json && p.metadata_json.category || s.category || 'other',
      base_price:     p.base_price,
      currency_code:  p.currency_code || 'VND',
      rating:         s.rating || 4.5,
      rating_count:   s.rating_count || 0,
      sold:           s.sold || 0,
      stock:          p.metadata_json && p.metadata_json.stock || s.stock || 99,
      weight_g:       p.weight_grams || s.weight_g || 0,
      warranty_months: s.warranty_months || 0,
      official:       s.official || false,
      color_options:  s.color_options || [],
      description:    p.metadata_json && p.metadata_json.description || s.description || '',
      specs:          s.specs || {},
      images:         s.images || [],
    };
  }

  window.UitAPI = {
    setUserId:      function (id) { _userId = id; },
    getUserId:      function () { return _userId; },
    mapApiProduct:  mapApiProduct,
    catalog:        catalog,
    cart:           cart,
    order:          order,
  };
})();
