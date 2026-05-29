#!/usr/bin/env python3
"""
UIT Store — Mock Backend Server (port 10000)
Giả lập Catalog, Cart, Order, Merchant service để test frontend không cần backend thật.

Chạy:
    python3 scripts/mock_server.py
"""

import json, uuid, datetime, re, os, secrets, hashlib, hmac as _hmac
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

PORT = 10000

# ── Nạp static products từ data.js ──────────────────────────────────────────
import subprocess, shutil

DATA_JS = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'data', 'data.js')

PRODUCTS  = []
MERCHANTS = {}

def _load_via_node():
    if not shutil.which('node'):
        return None, None
    script = f"""
global.window = {{}};
require({json.dumps(DATA_JS)});
process.stdout.write(JSON.stringify({{ products: global.window.PRODUCTS, merchants: global.window.MERCHANTS }}));
"""
    try:
        out = subprocess.check_output(['node', '-e', script], timeout=10)
        data = json.loads(out)
        return data['products'], data['merchants']
    except Exception as e:
        print(f'[warn] node load failed: {e}')
    return None, None

p, m = _load_via_node()
if p:
    PRODUCTS  = p
    MERCHANTS = m if isinstance(m, dict) else {}
    print(f'[mock] Loaded {len(PRODUCTS)} products, {len(MERCHANTS)} merchants từ data.js')
else:
    print('[mock] Không load được data.js qua Node — dùng fallback rỗng')

# ── In-memory stores ─────────────────────────────────────────────────────────
_carts   = {}   # { user_id: { merchant_id: { id, version, items: [...] } } }
_orders  = {}   # { user_id: [ order, ... ] }
_product_overrides = {}  # { product_id: { ...override fields... } }
_deleted_products  = set()
_new_products = []  # products added via API (not in data.js)
_api_keys  = {}   # { merchant_id: { current: {...}, history: [...] } }
_audit_logs = {}  # { merchant_id: [ log_entry, ... ] }

AUDIT_KEY = b'nt219-demo-audit-hmac-key-2026'

def _user_from_headers(headers):
    auth = headers.get('Authorization') or headers.get('authorization') or ''
    uid  = headers.get('X-User-Id')    or headers.get('x-user-id') or 'user_demo_001'
    if auth.startswith('Bearer '):
        try:
            payload_b64 = auth.split('.')[1]
            payload_b64 += '=' * (-len(payload_b64) % 4)
            import base64
            payload = json.loads(base64.b64decode(payload_b64))
            uid = payload.get('sub') or payload.get('email') or uid
        except Exception:
            pass
    return uid

def _now():
    return datetime.datetime.utcnow().isoformat() + 'Z'

def _ok(data):      return 200, {'data': data}
def _created(data): return 201, {'data': data}
def _not_found(msg='Not found'):
    return 404, {'error': {'code': 'NOT_FOUND', 'message': msg}}
def _bad(msg):
    return 400, {'error': {'code': 'BAD_REQUEST', 'message': msg}}

# ── Audit log helper ─────────────────────────────────────────────────────────
def _add_audit(merchant_id, action, resource, actor='merchant', ip='127.0.0.1'):
    logs = _audit_logs.setdefault(merchant_id, [])
    ts = _now()
    msg = f"{ts}|{action}|{resource}".encode()
    sig = _hmac.new(AUDIT_KEY, msg, hashlib.sha256).hexdigest()[:16]
    entry = {
        'id': 'log_' + uuid.uuid4().hex[:8],
        'timestamp': ts,
        'actor': actor,
        'action': action,
        'resource': resource,
        'ip': ip,
        'signature': f'hmac-sha256:{sig}',
        'sig_ok': True,
    }
    logs.insert(0, entry)
    if len(logs) > 200:
        logs.pop()
    return entry

# ── API Key helper ───────────────────────────────────────────────────────────
def _ensure_api_key(merchant_id):
    if merchant_id not in _api_keys:
        key = 'sk_live_' + secrets.token_hex(16)
        now = _now()
        exp = (datetime.datetime.utcnow() + datetime.timedelta(days=90)).isoformat() + 'Z'
        _api_keys[merchant_id] = {
            'current': {
                'id': 'key_' + secrets.token_hex(4),
                'masked': key[:12] + '••••••••••••••••',
                'created_at': now,
                'rotated_at': None,
                'expires_at': exp,
                'version': 1,
            },
            'history': [],
        }
    return _api_keys[merchant_id]

# ── Merchant lookup ──────────────────────────────────────────────────────────
def _merchant_for_user(user_id):
    for mid, m in MERCHANTS.items():
        if isinstance(m, dict) and m.get('owner_id') == user_id:
            return mid
    return None

def _get_all_products(merchant_id=None):
    base = [dict(p) for p in PRODUCTS if p['id'] not in _deleted_products]
    base += [dict(p) for p in _new_products if p['id'] not in _deleted_products]
    for p in base:
        if p['id'] in _product_overrides:
            p.update(_product_overrides[p['id']])
    if merchant_id:
        base = [p for p in base if p.get('merchant_id') == merchant_id]
    return base

# ── Catalog handlers ─────────────────────────────────────────────────────────
def handle_catalog_list(qs, user):
    page = int((qs.get('page') or ['1'])[0])
    size = int((qs.get('size') or ['50'])[0])
    all_p = _get_all_products()
    start = (page - 1) * size
    items = all_p[start:start + size]
    mapped = []
    for p in items:
        mapped.append({
            'id':            p['id'],
            'merchant_id':   p['merchant_id'],
            'sku':           p['sku'],
            'name':          p['name'],
            'brand':         p.get('brand', ''),
            'base_price':    p['base_price'],
            'currency_code': p.get('currency_code', 'VND'),
            'weight_grams':  p.get('weight_g', 0),
            'status':        'active' if p.get('is_active', True) else 'inactive',
            'is_active':     p.get('is_active', True),
            'metadata_json': {
                'category':    p.get('category', 'other'),
                'rating':      p.get('rating', 4.5),
                'stock':       p.get('stock', 99),
                'description': p.get('description', ''),
                'sold':        p.get('sold', 0),
                'rating_count': p.get('rating_count', 0),
                'warranty_months': p.get('warranty_months', 0),
                'color_options':   p.get('color_options', []),
                'specs':           p.get('specs', {}),
                'official':        p.get('official', False),
            },
            'images': p.get('images', []),
            'created_at': '2026-01-01T00:00:00Z',
        })
    return _ok({'items': mapped, 'total': len(all_p), 'page': page, 'size': size})

def handle_catalog_get(product_id, user):
    p = next((x for x in _get_all_products() if x['id'] == product_id), None)
    if not p:
        return _not_found(f'Product {product_id} not found')
    return _ok(p)

# ── Cart handlers ────────────────────────────────────────────────────────────
def handle_cart_list(user):
    return _ok(list(_carts.get(user, {}).values()))

def handle_cart_add(merchant_id, body, user):
    user_carts = _carts.setdefault(user, {})
    cart = user_carts.get(merchant_id)
    if not cart:
        cart = {'id': 'cart_' + uuid.uuid4().hex[:8], 'merchant_id': merchant_id, 'version': 1, 'items': []}
        user_carts[merchant_id] = cart
    req_version = body.get('cart_version', 1)
    if req_version != cart['version']:
        return 409, {'error': {'code': 'VERSION_CONFLICT', 'message': 'Cart version conflict'}}
    pid = body.get('product_id')
    qty = body.get('quantity', 1)
    existing = next((i for i in cart['items'] if i['product_id'] == pid), None)
    if existing:
        existing['quantity'] += qty
    else:
        cart['items'].append({
            'id':         'item_' + uuid.uuid4().hex[:8],
            'product_id': pid,
            'merchant_id': merchant_id,
            'quantity':   qty,
            'unit_price': body.get('unit_price_snapshot', 0),
            'name':       body.get('product_name_snapshot', ''),
        })
    cart['version'] += 1
    return _created(cart)

# ── Order handlers ───────────────────────────────────────────────────────────
def handle_order_checkout(body, idempotency_key, user):
    items = body.get('items', [])
    # Enrich each item with merchant_id from PRODUCTS
    all_p = _get_all_products()
    for item in items:
        if 'merchant_id' not in item or not item['merchant_id']:
            pid = item.get('product_id', '')
            prod = next((p for p in all_p if p['id'] == pid), None)
            if prod:
                item['merchant_id'] = prod.get('merchant_id', '')
    order_id = 'UIT-' + datetime.datetime.utcnow().strftime('%Y%m%d') + '-' + uuid.uuid4().hex[:4].upper()
    order = {
        'parent_order_number': order_id,
        'status': 'pending',   # ← starts pending, merchant must confirm
        'user_id': user,
        'total_amount': sum(i.get('unit_price', 0) * i.get('quantity', 1) for i in items) + body.get('shipping_fee', 0),
        'payment_method_type': body.get('payment_method_type', 'cod'),
        'shipping_address': body.get('shipping_address', {}),
        'items': items,
        'shipping_fee': body.get('shipping_fee', 0),
        'created_at': _now(),
        'items_count': len(items),
    }
    _orders.setdefault(user, []).insert(0, order)
    _carts[user] = {}
    # Add audit entry for each involved merchant
    seen_merchants = set(i.get('merchant_id', '') for i in items if i.get('merchant_id'))
    for mid in seen_merchants:
        _add_audit(mid, 'new_order', order_id, actor=user)
    return _created(order)

def handle_order_list(user):
    return _ok(_orders.get(user, []))

def handle_order_get(order_id, user):
    for o in _orders.get(user, []):
        if o['parent_order_number'] == order_id:
            return _ok(o)
    return _not_found(f'Order {order_id} not found')

# ── Merchant Order handlers ──────────────────────────────────────────────────
def handle_merchant_order_list(qs, user):
    merchant_id = (qs.get('merchant_id') or [''])[0]
    if not merchant_id:
        merchant_id = _merchant_for_user(user) or ''
    status_filter = (qs.get('status') or [None])[0]
    result = []
    for user_orders in _orders.values():
        for order in user_orders:
            merchant_items = [i for i in order.get('items', []) if i.get('merchant_id') == merchant_id]
            if merchant_items:
                o = dict(order, items=merchant_items)
                if not status_filter or o['status'] == status_filter:
                    result.append(o)
    result.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return _ok(result)

def handle_merchant_order_status(order_id, body, user):
    new_status = body.get('status', '')
    valid = {'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'}
    if new_status not in valid:
        return _bad(f'Invalid status: {new_status}')
    merchant_id = _merchant_for_user(user) or body.get('merchant_id', '')
    for user_orders in _orders.values():
        for order in user_orders:
            if order['parent_order_number'] == order_id:
                old = order['status']
                order['status'] = new_status
                order['updated_at'] = _now()
                _add_audit(merchant_id, 'order_status_change',
                           f'{order_id}: {old}→{new_status}', actor=user)
                return _ok(order)
    return _not_found(f'Order {order_id} not found')

# ── Merchant Product handlers ────────────────────────────────────────────────
def handle_merchant_product_list(qs, user):
    merchant_id = (qs.get('merchant_id') or [''])[0]
    if not merchant_id:
        merchant_id = _merchant_for_user(user) or ''
    products = _get_all_products(merchant_id)
    return _ok(products)

def handle_merchant_product_create(body, user):
    merchant_id = _merchant_for_user(user) or body.get('merchant_id', 'user_demo_001')
    new_id = 'p_m_' + uuid.uuid4().hex[:8]
    product = {
        'id':           new_id,
        'merchant_id':  merchant_id,
        'sku':          body.get('sku', 'SKU-' + new_id[-6:].upper()),
        'name':         body.get('name', 'Sản phẩm mới'),
        'brand':        body.get('brand', ''),
        'category':     body.get('category', 'other'),
        'base_price':   int(body.get('price', body.get('base_price', 0))),
        'currency_code':'VND',
        'rating':       5.0, 'rating_count': 0, 'sold': 0,
        'stock':        int(body.get('stock', 0)),
        'weight_g':     int(body.get('weight_g', 0)),
        'warranty_months': int(body.get('warranty_months', 0)),
        'official':     False, 'color_options': [], 'images': [],
        'description':  body.get('description', ''),
        'specs':        body.get('specs', {}),
        'is_active':    True,
        'created_at':   _now(),
    }
    _new_products.append(product)
    _add_audit(merchant_id, 'product_create', new_id, actor=user)
    return _created(product)

def handle_merchant_product_update(product_id, body, user):
    merchant_id = _merchant_for_user(user) or ''
    all_p = _get_all_products()
    found = next((p for p in all_p if p['id'] == product_id), None)
    if not found:
        return _not_found(f'Product {product_id} not found')
    override = _product_overrides.setdefault(product_id, {})
    for field in ('name', 'brand', 'category', 'base_price', 'stock', 'description',
                  'is_active', 'warranty_months', 'weight_g'):
        if field in body:
            override[field] = body[field]
    if 'price' in body:
        override['base_price'] = int(body['price'])
    _add_audit(merchant_id, 'product_update', product_id, actor=user)
    updated = dict(found, **override)
    return _ok(updated)

def handle_merchant_product_delete(product_id, user):
    merchant_id = _merchant_for_user(user) or ''
    _deleted_products.add(product_id)
    _add_audit(merchant_id, 'product_delete', product_id, actor=user)
    return _ok({'deleted': True})

# ── Finance handlers ─────────────────────────────────────────────────────────
def handle_finance_balance(qs, user):
    merchant_id = (qs.get('merchant_id') or [''])[0] or _merchant_for_user(user) or ''
    total = 0.0
    for user_orders in _orders.values():
        for order in user_orders:
            if order.get('status') == 'delivered':
                for item in order.get('items', []):
                    if item.get('merchant_id') == merchant_id:
                        total += item.get('unit_price', 0) * item.get('quantity', 1) * 0.95
    pending_balance = total * 0.3
    available = total * 0.7
    return _ok({
        'merchant_id': merchant_id,
        'available': round(available),
        'pending':   round(pending_balance),
        'total':     round(total),
        'currency':  'VND',
        'bank_account': {'masked': '970****5678', 'bank': 'VietcomBank', 'encryption': 'AES-256-GCM'},
    })

def handle_finance_transactions(qs, user):
    merchant_id = (qs.get('merchant_id') or [''])[0] or _merchant_for_user(user) or ''
    txns = []
    for user_orders in _orders.values():
        for order in user_orders:
            for item in order.get('items', []):
                if item.get('merchant_id') == merchant_id:
                    amount = item.get('unit_price', 0) * item.get('quantity', 1)
                    fee    = round(amount * 0.05)
                    txns.append({
                        'id':       'txn_' + order['parent_order_number'],
                        'date':     order.get('created_at', ''),
                        'desc':     f"Đơn hàng {order['parent_order_number']}",
                        'type':     'income' if order.get('status') == 'delivered' else 'pending',
                        'amount':   amount,
                        'fee':      fee,
                        'net':      amount - fee,
                        'status':   order.get('status'),
                        'order_id': order['parent_order_number'],
                    })
    txns.sort(key=lambda x: x['date'], reverse=True)
    return _ok(txns)

def handle_finance_withdraw(body, user):
    merchant_id = _merchant_for_user(user) or ''
    amount = body.get('amount', 0)
    txn = {
        'id':         'wd_' + uuid.uuid4().hex[:8],
        'type':       'withdrawal',
        'amount':     amount,
        'status':     'processing',
        'requested_at': _now(),
        'eta':        '1-3 ngày làm việc',
    }
    _add_audit(merchant_id, 'withdrawal_request', f'amount={amount}', actor=user)
    return _created(txn)

# ── Security handlers ─────────────────────────────────────────────────────────
def handle_security_api_keys(qs, user):
    merchant_id = (qs.get('merchant_id') or [''])[0] or _merchant_for_user(user) or ''
    key_info = _ensure_api_key(merchant_id)
    return _ok({
        'merchant_id': merchant_id,
        'current': {k: v for k, v in key_info['current'].items() if k != 'full'},
        'history': key_info.get('history', []),
    })

def handle_security_rotate_key(body, user):
    merchant_id = _merchant_for_user(user) or body.get('merchant_id', '')
    key_info = _ensure_api_key(merchant_id)
    old = dict(key_info['current'])
    old.pop('full', None)
    key_info['history'].insert(0, old)
    if len(key_info['history']) > 10:
        key_info['history'].pop()
    new_key = 'sk_live_' + secrets.token_hex(16)
    now = _now()
    exp = (datetime.datetime.utcnow() + datetime.timedelta(days=90)).isoformat() + 'Z'
    key_info['current'] = {
        'id': 'key_' + secrets.token_hex(4),
        'masked': new_key[:12] + '••••••••••••••••',
        'full': new_key,
        'created_at': now,
        'rotated_at': now,
        'expires_at': exp,
        'version': old.get('version', 1) + 1,
    }
    _add_audit(merchant_id, 'api_key_rotate', f"v{old.get('version',1)}→v{key_info['current']['version']}", actor=user)
    result = {k: v for k, v in key_info['current'].items() if k != 'full'}
    result['new_key_full'] = new_key
    return _ok(result)

def handle_security_audit_log(qs, user):
    merchant_id = (qs.get('merchant_id') or [''])[0] or _merchant_for_user(user) or ''
    logs = _audit_logs.get(merchant_id, [])
    if not logs:
        # Seed with demo entries
        for a, r in [
            ('login', 'device=MacBook · Touch ID · WebAuthn'),
            ('product_update', 'sku=IP15PM-256-NTI · hmac-sha256(✓)'),
            ('api_key_rotate', 'v3→v4 · auto-rotation'),
            ('order_status_change', 'UIT-20260529-DEMO: pending→confirmed'),
        ]:
            _add_audit(merchant_id, a, r, actor='system')
    return _ok(_audit_logs.get(merchant_id, []))

# ── HTTP Handler ─────────────────────────────────────────────────────────────
class MockHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print(f'[{datetime.datetime.now().strftime("%H:%M:%S")}] {self.command} {self.path} → {args[1] if len(args)>1 else ""}')

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-Id,Idempotency-Key')

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def _read_body(self):
        length = int(self.headers.get('Content-Length') or 0)
        if length:
            return json.loads(self.rfile.read(length))
        return {}

    def _respond(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(data))
        self._cors()
        self.end_headers()
        self.wfile.write(data)

    def _route(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip('/')
        qs     = parse_qs(parsed.query)
        user   = _user_from_headers(self.headers)
        method = self.command

        # ── Catalog ──────────────────────────────────────────────────────────
        if method == 'GET' and path == '/api/v1/catalog/public/products':
            return handle_catalog_list(qs, user)
        m = re.match(r'^/api/v1/catalog/public/products/(.+)$', path)
        if m and method == 'GET':
            return handle_catalog_get(m.group(1), user)

        # Merchant catalog
        if method == 'GET' and path == '/api/v1/catalog/merchant/products':
            return handle_merchant_product_list(qs, user)
        if method == 'POST' and path == '/api/v1/catalog/merchant/products':
            return handle_merchant_product_create(self._read_body(), user)
        m = re.match(r'^/api/v1/catalog/merchant/products/(.+)$', path)
        if m:
            pid = m.group(1)
            if method == 'PUT':    return handle_merchant_product_update(pid, self._read_body(), user)
            if method == 'DELETE': return handle_merchant_product_delete(pid, user)

        # ── Cart ──────────────────────────────────────────────────────────────
        if method == 'GET' and path == '/api/v1/cart/user/carts':
            return handle_cart_list(user)
        m = re.match(r'^/api/v1/cart/user/carts/([^/]+)/items$', path)
        if m:
            merchant_id = m.group(1)
            if method == 'POST':   return handle_cart_add(merchant_id, self._read_body(), user)
            if method == 'DELETE':
                user_carts = _carts.get(user, {})
                if merchant_id in user_carts:
                    user_carts[merchant_id]['items'] = []
                    user_carts[merchant_id]['version'] += 1
                return _ok({'cleared': True})
        m = re.match(r'^/api/v1/cart/user/carts/([^/]+)/items/([^/]+)$', path)
        if m:
            merchant_id, item_id = m.group(1), m.group(2)
            cart = _carts.get(user, {}).get(merchant_id, {})
            if method == 'PUT':
                body = self._read_body()
                for item in cart.get('items', []):
                    if item['id'] == item_id:
                        item['quantity'] = body.get('quantity', item['quantity'])
                if cart: cart['version'] += 1
                return _ok(cart)
            if method == 'DELETE':
                if cart:
                    cart['items'] = [i for i in cart.get('items', []) if i['id'] != item_id]
                    cart['version'] += 1
                return _ok({'deleted': True})

        # ── Orders (user) ─────────────────────────────────────────────────────
        if method == 'POST' and path == '/api/v1/orders/user/orders/checkout':
            idem = self.headers.get('Idempotency-Key') or ''
            return handle_order_checkout(self._read_body(), idem, user)
        if method == 'GET' and path == '/api/v1/orders/user/orders':
            return handle_order_list(user)
        m = re.match(r'^/api/v1/orders/user/orders/(.+)$', path)
        if m and method == 'GET':
            return handle_order_get(m.group(1), user)

        # ── Orders (merchant) ─────────────────────────────────────────────────
        if method == 'GET' and path == '/api/v1/orders/merchant/orders':
            return handle_merchant_order_list(qs, user)
        m = re.match(r'^/api/v1/orders/merchant/orders/([^/]+)/status$', path)
        if m and method == 'PUT':
            return handle_merchant_order_status(m.group(1), self._read_body(), user)

        # ── Finance ───────────────────────────────────────────────────────────
        if method == 'GET'  and path == '/api/v1/finance/merchant/balance':
            return handle_finance_balance(qs, user)
        if method == 'GET'  and path == '/api/v1/finance/merchant/transactions':
            return handle_finance_transactions(qs, user)
        if method == 'POST' and path == '/api/v1/finance/merchant/withdraw':
            return handle_finance_withdraw(self._read_body(), user)

        # ── Security ──────────────────────────────────────────────────────────
        if method == 'GET'  and path == '/api/v1/security/merchant/api-keys':
            return handle_security_api_keys(qs, user)
        if method == 'POST' and path == '/api/v1/security/merchant/api-keys/rotate':
            return handle_security_rotate_key(self._read_body(), user)
        if method == 'GET'  and path == '/api/v1/security/merchant/audit-log':
            return handle_security_audit_log(qs, user)

        return 404, {'error': {'code': 'NOT_FOUND', 'message': f'Route {method} {path} not found'}}

    def do_GET(self):    self._respond(*self._route())
    def do_POST(self):   self._respond(*self._route())
    def do_PUT(self):    self._respond(*self._route())
    def do_DELETE(self): self._respond(*self._route())


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), MockHandler)
    print(f'')
    print(f'  UIT Store Mock Backend — http://localhost:{PORT}')
    print(f'  Endpoints:')
    print(f'    GET  /api/v1/catalog/public/products')
    print(f'    GET  /api/v1/orders/merchant/orders?merchant_id={{id}}')
    print(f'    PUT  /api/v1/orders/merchant/orders/{{id}}/status')
    print(f'    GET  /api/v1/catalog/merchant/products?merchant_id={{id}}')
    print(f'    POST /api/v1/catalog/merchant/products')
    print(f'    GET  /api/v1/finance/merchant/balance')
    print(f'    GET  /api/v1/security/merchant/audit-log')
    print(f'    POST /api/v1/security/merchant/api-keys/rotate')
    print(f'')
    print(f'  Nhấn Ctrl+C để dừng.')
    print(f'')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[mock] Đã dừng.')
