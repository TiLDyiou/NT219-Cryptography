// UIT Store — App router

const App = () => {
  const [screen, setScreen] = React.useState('home');
  const [productId, setProductId] = React.useState('p_001');
  const [cart, setCart] = React.useState([
    { productId: 'p_001', qty: 1 },
    { productId: 'p_011', qty: 1 },
    { productId: 'p_003', qty: 2 },
  ]);
  const [user, setUser] = React.useState(null);
  const [show3DS, setShow3DS] = React.useState(false);
  const [orderTotal, setOrderTotal] = React.useState(0);
  const [showNav, setShowNav] = React.useState(false);

  const nav = (target, id) => {
    setScreen(target);
    if (id) setProductId(id);
    // Scroll to top of content area
    setTimeout(() => {
      window.scrollTo(0, 0);
      const root = document.querySelector('.app-content');
      if (root) root.scrollTop = 0;
    }, 0);
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleAddToCart = (product, qty) => {
    const existing = cart.find(c => c.productId === product.id);
    if (existing) {
      setCart(cart.map(c => c.productId === product.id ? { ...c, qty: c.qty + qty } : c));
    } else {
      setCart([...cart, { productId: product.id, qty }]);
    }
    // Toast
    toast(`Đã thêm "${product.name.substring(0, 40)}..." vào giỏ`);
  };

  const handleBuyNow = (product, qty) => {
    handleAddToCart(product, qty);
    nav('cart');
  };

  const handlePay = (paymentMethod) => {
    // Calculate total
    const items = cart.map(c => ({ ...c, product: window.PRODUCTS.find(p => p.id === c.productId) })).filter(i => i.product);
    const subtotal = items.reduce((s, i) => s + i.product.base_price * i.qty, 0);
    const ship = subtotal > 500000 ? 0 : 25000;
    const total = subtotal + ship;
    setOrderTotal(total);

    if (paymentMethod === 'credit') {
      setShow3DS(true);
    } else {
      // Skip 3DS for other methods
      setCart([]);
      nav('order');
    }
  };

  const complete3DS = () => {
    setShow3DS(false);
    setCart([]);
    nav('order');
  };

  // Toast (simple, transient)
  const [toastMsg, setToastMsg] = React.useState(null);
  const toast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  const tabUrls = {
    home: 'uitstore.vn/',
    product: `uitstore.vn/p/${productId}`,
    cart: 'uitstore.vn/checkout/cart',
    checkout: 'uitstore.vn/checkout/payment',
    order: 'uitstore.vn/order/UIT-2026052401-A7F3',
    login: 'uitstore.vn/account/login',
    merchant: 'seller.uitstore.vn/dashboard',
  };

  const tabTitle = {
    home: 'UIT Store · Tốt & Nhanh',
    product: 'Chi tiết sản phẩm — UIT Store',
    cart: 'Giỏ hàng — UIT Store',
    checkout: 'Thanh toán — UIT Store',
    order: 'Đặt hàng thành công — UIT Store',
    login: 'Đăng nhập — UIT Store',
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }} className="app-content">
      {screen !== 'login' && screen !== 'merchant' && (
        <Header nav={screen} cartCount={cartCount} onNav={nav} user={user} />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {screen === 'home' && <HomeScreen onProduct={(id) => nav('product', id)} onNav={nav} />}
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
        {screen === 'order' && <OrderScreen orderTotal={orderTotal} onNav={nav} />}
        {screen === 'login' && (
          <LoginScreen
            onLogin={(u) => { setUser(u); nav('home'); toast('Đăng nhập thành công · Phiên JWT đã được tạo'); }}
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
            { id: 'home', label: 'Trang chủ' },
            { id: 'product', label: 'Sản phẩm' },
            { id: 'cart', label: 'Giỏ hàng' },
            { id: 'checkout', label: 'Thanh toán' },
            { id: 'order', label: 'Đặt hàng OK' },
            { id: 'login', label: 'Đăng nhập' },
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
          onCancel={() => setShow3DS(false)}
        />
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
