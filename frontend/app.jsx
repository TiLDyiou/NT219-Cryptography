// UIT Store — App router

const App = () => {
  const [screen, setScreen]           = React.useState('home');
  const [productId, setProductId]     = React.useState('p_001');
  const [cart, setCart]               = React.useState([
    { productId: 'p_001', qty: 1 },
    { productId: 'p_011', qty: 1 },
    { productId: 'p_003', qty: 2 },
  ]);
  const [user, setUser]               = React.useState(null);
  const [show3DS, setShow3DS]         = React.useState(false);
  const [orderTotal, setOrderTotal]   = React.useState(0);
  const [showNav, setShowNav]         = React.useState(false);

  // API integration state
  const [productsVersion, setProductsVersion] = React.useState(0); // trigger re-render khi products thay đổi
  const [cartVersions, setCartVersions]       = React.useState({}); // { [merchantId]: { cartId, version } }
  const [pendingCheckout, setPendingCheckout] = React.useState(null);
  const [realOrderId, setRealOrderId]         = React.useState(null);
  const [apiStatus, setApiStatus]             = React.useState({
    catalog: 'unknown', // 'ok' | 'error' | 'unknown'
    cart:    'unknown',
    order:   'unknown',
  });

  // ── Load products từ Catalog Service khi mount ──────────────────────
  React.useEffect(() => {
    window.UitAPI.catalog.listProducts()
      .then(function (res) {
        const apiProducts = res && res.data;
        if (apiProducts && apiProducts.length > 0) {
          // Map API schema → window.PRODUCTS schema, supplement từ static data nếu có
          const mapped = apiProducts.map(function (p) {
            const staticMatch = (window.PRODUCTS || []).find(function (s) {
              return s.sku === p.sku || s.id === p.id;
            });
            return window.UitAPI.mapApiProduct(p, staticMatch);
          });
          window.PRODUCTS = mapped;
          setProductsVersion(function (v) { return v + 1; });
          setApiStatus(function (prev) { return Object.assign({}, prev, { catalog: 'ok' }); });
        } else {
          // DB trống → giữ static data
          setApiStatus(function (prev) { return Object.assign({}, prev, { catalog: 'ok' }); });
        }
      })
      .catch(function () {
        setApiStatus(function (prev) { return Object.assign({}, prev, { catalog: 'error' }); });
      });

    // Load cart từ Cart Service (khôi phục trạng thái giỏ hàng nếu user đã đăng nhập trước)
    window.UitAPI.cart.list()
      .then(function (res) {
        const carts = res && res.data;
        if (!carts || carts.length === 0) return;

        const meta = {};
        const items = [];
        carts.forEach(function (c) {
          meta[c.merchant_id] = { cartId: c.id, version: c.version };
          c.items.forEach(function (item) {
            items.push({ productId: item.product_id, qty: item.quantity, itemId: item.id });
          });
        });
        // Chỉ restore nếu giỏ backend không trống
        if (items.length > 0) {
          setCart(items);
          setCartVersions(meta);
        } else {
          setCartVersions(meta);
        }
        setApiStatus(function (prev) { return Object.assign({}, prev, { cart: 'ok' }); });
      })
      .catch(function () {
        setApiStatus(function (prev) { return Object.assign({}, prev, { cart: 'error' }); });
      });
  }, []);

  const nav = (target, id) => {
    setScreen(target);
    if (id) setProductId(id);
    setTimeout(() => {
      window.scrollTo(0, 0);
      const root = document.querySelector('.app-content');
      if (root) root.scrollTop = 0;
    }, 0);
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  // ── Đồng bộ thêm item với Cart Service (background, non-blocking) ───
  const syncCartAdd = React.useCallback(function (product, qty) {
    const merchantId = product.merchant_id;
    const currentMeta = cartVersions[merchantId];
    const version = currentMeta ? currentMeta.version : 1;

    const doAdd = function (ver) {
      return window.UitAPI.cart.addItem(merchantId, {
        cart_version:           ver,
        product_id:             product.id,
        quantity:               qty,
        unit_price_snapshot:    product.base_price,
        product_name_snapshot:  product.name,
      }).then(function (res) {
        const cartData = res && res.data;
        if (cartData) {
          setCartVersions(function (prev) {
            const next = Object.assign({}, prev);
            next[merchantId] = { cartId: cartData.id, version: cartData.version };
            return next;
          });
        }
        setApiStatus(function (prev) { return Object.assign({}, prev, { cart: 'ok' }); });
      });
    };

    doAdd(version).catch(function (err) {
      // Version conflict → refresh cart rồi retry
      if (err.status === 409 || err.status === 400) {
        window.UitAPI.cart.list().then(function (res) {
          const carts = res && res.data;
          if (!carts) return;
          const mc = carts.find(function (c) { return c.merchant_id === merchantId; });
          if (mc) {
            setCartVersions(function (prev) {
              const next = Object.assign({}, prev);
              next[merchantId] = { cartId: mc.id, version: mc.version };
              return next;
            });
            doAdd(mc.version).catch(function () {});
          }
        }).catch(function () {});
      }
      setApiStatus(function (prev) { return Object.assign({}, prev, { cart: 'error' }); });
    });
  }, [cartVersions]);

  const handleAddToCart = (product, qty) => {
    // 1. Cập nhật UI ngay lập tức
    const existing = cart.find(c => c.productId === product.id);
    if (existing) {
      setCart(cart.map(c => c.productId === product.id ? { ...c, qty: c.qty + qty } : c));
    } else {
      setCart([...cart, { productId: product.id, qty }]);
    }
    toast(`Đã thêm "${product.name.substring(0, 40)}..." vào giỏ`);

    // 2. Đồng bộ với Cart Service
    syncCartAdd(product, qty);
  };

  const handleBuyNow = (product, qty) => {
    handleAddToCart(product, qty);
    nav('cart');
  };

  // ── Build checkout payload ───────────────────────────────────────────
  const buildCheckoutPayload = React.useCallback(function (paymentMethod) {
    const items = cart.map(function (c) {
      const product = (window.PRODUCTS || []).find(function (p) { return p.id === c.productId; });
      if (!product) return null;
      return {
        product_id:   product.id,
        variant_id:   null,
        merchant_id:  product.merchant_id,
        sku:          product.sku,
        product_name: product.name,
        quantity:     c.qty,
        unit_price:   product.base_price,
      };
    }).filter(Boolean);

    const subtotal     = items.reduce(function (s, i) { return s + i.unit_price * i.quantity; }, 0);
    const shipping_fee = subtotal > 500000 ? 0 : 25000;

    // Dùng cart_id từ backend nếu có, fallback sang synthetic
    const firstMerchantId = items.length > 0 ? items[0].merchant_id : 'unknown';
    const cartMeta = cartVersions[firstMerchantId];
    const cartId   = cartMeta ? cartMeta.cartId : ('demo_cart_' + Date.now());

    const pmType = paymentMethod === 'credit' ? 'credit_card'
                 : paymentMethod === 'cod'    ? 'cod'
                 : 'e_wallet';

    return {
      cart_id:              cartId,
      payment_method_type:  pmType,
      shipping_fee:         shipping_fee,
      customer_note:        null,
      items:                items,
      shipping_address: {
        full_name:      'Nguyễn Văn An',
        phone:          '0912345789',
        email:          'an.nguyen@uit.edu.vn',
        address_line1:  'Số 1 Hàn Thuyên, Phường Linh Trung',
        city:           'TP. Hồ Chí Minh',
        state_province: 'TP. Thủ Đức',
        postal_code:    '700000',
      },
    };
  }, [cart, cartVersions]);

  // ── Gọi Order Service để đặt hàng ───────────────────────────────────
  const doCheckout = React.useCallback(function (payload) {
    const idempotencyKey = 'idem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    return window.UitAPI.order.checkout(payload, idempotencyKey)
      .then(function (res) {
        const orderNum = (res && res.data && res.data.parent_order_number) || null;
        if (orderNum) setRealOrderId(orderNum);
        setApiStatus(function (prev) { return Object.assign({}, prev, { order: 'ok' }); });
      })
      .catch(function (err) {
        console.warn('[UIT Store] Order API:', err.message);
        setApiStatus(function (prev) { return Object.assign({}, prev, { order: 'error' }); });
      })
      .finally(function () {
        setCart([]);
        nav('order');
      });
  }, [cart, cartVersions]);

  const handlePay = (paymentMethod) => {
    const payload = buildCheckoutPayload(paymentMethod);
    const subtotal = (payload.items || []).reduce(function (s, i) { return s + i.unit_price * i.quantity; }, 0);
    setOrderTotal(subtotal + Number(payload.shipping_fee));

    if (paymentMethod === 'credit') {
      setPendingCheckout(payload);
      setShow3DS(true);
    } else {
      doCheckout(payload);
    }
  };

  const complete3DS = () => {
    setShow3DS(false);
    const payload = pendingCheckout || buildCheckoutPayload('credit');
    setPendingCheckout(null);
    doCheckout(payload);
  };

  // Toast
  const [toastMsg, setToastMsg] = React.useState(null);
  const toast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  const tabUrls = {
    home:     'uitstore.vn/',
    product:  `uitstore.vn/p/${productId}`,
    cart:     'uitstore.vn/checkout/cart',
    checkout: 'uitstore.vn/checkout/payment',
    order:    'uitstore.vn/order/' + (realOrderId || 'UIT-2026052401-A7F3'),
    login:    'uitstore.vn/account/login',
    merchant: 'seller.uitstore.vn/dashboard',
  };

  const tabTitle = {
    home:     'UIT Store · Tốt & Nhanh',
    product:  'Chi tiết sản phẩm — UIT Store',
    cart:     'Giỏ hàng — UIT Store',
    checkout: 'Thanh toán — UIT Store',
    order:    'Đặt hàng thành công — UIT Store',
    login:    'Đăng nhập — UIT Store',
    merchant: 'Seller Center — UIT Store',
  };

  React.useEffect(() => {
    document.title = tabTitle[screen];
  }, [screen]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '`' || e.key === 'Backquote') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
          return;
        }
        setShowNav(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Khi user đăng nhập, cập nhật userId trong API client
  const handleLogin = (u) => {
    setUser(u);
    if (u && u.email) {
      window.UitAPI.setUserId(u.email);
    }
    nav('home');
    toast('Đăng nhập thành công · Phiên JWT đã được tạo');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }} className="app-content">
      {screen !== 'login' && screen !== 'merchant' && (
        <Header nav={screen} cartCount={cartCount} onNav={nav} user={user} />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {screen === 'home' && (
          <HomeScreen
            onProduct={(id) => nav('product', id)}
            onNav={nav}
            apiStatus={apiStatus}
            productsVersion={productsVersion}
          />
        )}
        {screen === 'product' && (
          <ProductScreen
            productId={productId}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onNav={nav}
          />
        )}
        {screen === 'cart' && <CartScreen cart={cart} setCart={setCart} onNav={nav} />}
        {screen === 'checkout' && <CheckoutScreen cart={cart} onNav={nav} onPay={handlePay} />}
        {screen === 'order' && <OrderScreen orderTotal={orderTotal} orderId={realOrderId} onNav={nav} />}
        {screen === 'login' && (
          <LoginScreen
            onLogin={handleLogin}
            onNav={nav}
          />
        )}
        {screen === 'merchant' && <MerchantScreen onNav={nav} />}
      </div>

      {screen !== 'login' && screen !== 'merchant' && screen !== 'order' && <Footer />}

      {/* Floating screen nav */}
      {showNav && (
        <div className="floating-nav" style={{
          position: 'fixed', bottom: 18, right: 18, zIndex: 90,
          background: 'var(--ink-900)', color: 'white',
          borderRadius: 30, padding: '6px 6px 6px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: 'var(--shadow-lg)', fontSize: 12,
          flexWrap: 'wrap', maxWidth: 'calc(100vw - 36px)',
        }}>
          <span style={{ opacity: 0.7, marginRight: 4 }} className="floating-nav-label hide-mobile">Khám phá:</span>
          {[
            { id: 'home',     label: 'Trang chủ' },
            { id: 'product',  label: 'Sản phẩm' },
            { id: 'cart',     label: 'Giỏ hàng' },
            { id: 'checkout', label: 'Thanh toán' },
            { id: 'order',    label: 'Đặt hàng OK' },
            { id: 'login',    label: 'Đăng nhập' },
            { id: 'merchant', label: 'Seller' },
          ].map(t => (
            <button key={t.id} onClick={() => nav(t.id)} style={{
              padding: '5px 11px', borderRadius: 16,
              background: screen === t.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              color: 'white', fontWeight: 500, fontSize: 11,
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 95,
          background: 'var(--ink-900)', color: 'white',
          padding: '12px 16px', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: 'var(--shadow-lg)', fontSize: 13,
          animation: 'slide-in 0.25s ease-out',
          maxWidth: 360,
        }}>
          <Icon name="check-circle" size={18} color="var(--success)" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 3DS modal */}
      {show3DS && (
        <ThreeDSModal
          amount={orderTotal}
          onComplete={complete3DS}
          onCancel={() => { setShow3DS(false); setPendingCheckout(null); }}
        />
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
