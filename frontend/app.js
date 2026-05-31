// UIT Store — App router

const App = () => {
  const [screen, setScreen] = React.useState('home');
  const [productId, setProductId] = React.useState(null);
  const [cart, setCart] = React.useState([]);
  const [user, setUser] = React.useState(null);
  const [orderTotal, setOrderTotal] = React.useState(0);
  const [showNav, setShowNav] = React.useState(false);

  // API integration state
  const [productsVersion, setProductsVersion] = React.useState(0); // trigger re-render khi products thay đổi
  const [cartVersions, setCartVersions] = React.useState({}); // { [merchantId]: { cartId, version } }
  const [realOrderId, setRealOrderId] = React.useState(null);
  const [checkoutIds, setCheckoutIds] = React.useState(null);
  const [lastOrderPayload, setLastOrderPayload] = React.useState(null);
  const [apiStatus, setApiStatus] = React.useState({
    catalog: 'unknown',
    // 'loading' | 'ok' | 'error' | 'unknown'
    cart: 'unknown',
    order: 'unknown'
  });

  // ── Load products + cart từ backend ─────────────────────────────────
  function loadData() {
    window.PRODUCTS = [];
    setProductsVersion(function (v) {
      return v + 1;
    });
    setApiStatus(function (prev) {
      return Object.assign({}, prev, {
        catalog: 'loading'
      });
    });
    window.UitAPI.lastCatalogError = null;
    window.UitAPI.catalog.listProducts().then(function (res) {
      const apiProducts = res && res.data;
      if (apiProducts && apiProducts.length > 0) {
        const mapped = apiProducts.map(function (p) {
          return window.UitAPI.mapApiProduct(p);
        });
        window.PRODUCTS = mapped;
      } else {
        window.PRODUCTS = [];
      }
      setProductsVersion(function (v) {
        return v + 1;
      });
      setApiStatus(function (prev) {
        return Object.assign({}, prev, {
          catalog: 'ok'
        });
      });
    }).catch(function (err) {
      console.warn('[UIT Store] Catalog fetch failed:', err && err.message, err);
      window.UitAPI.lastCatalogError = err && err.message || 'Không kết nối được Catalog Service';
      window.PRODUCTS = [];
      setProductsVersion(function (v) {
        return v + 1;
      });
      setApiStatus(function (prev) {
        return Object.assign({}, prev, {
          catalog: 'error'
        });
      });
    });
    if (!window.UitAuth || !window.UitAuth.isAuthenticated()) {
      setCart([]);
      setCartVersions({});
      setApiStatus(function (prev) {
        return Object.assign({}, prev, {
          cart: 'unknown'
        });
      });
      return;
    }
    window.UitAPI.cart.list().then(function (res) {
      const carts = res && res.data;
      if (!carts || carts.length === 0) return;
      window.UitAPI.mergeCartSnapshotsIntoProducts(carts);
      setProductsVersion(function (v) {
        return v + 1;
      });
      const meta = {};
      const items = [];
      carts.forEach(function (c) {
        meta[c.merchant_id] = {
          cartId: c.id,
          version: c.version
        };
        c.items.forEach(function (item) {
          items.push(window.UitAPI.mapCartItemRow(item));
        });
      });
      if (items.length > 0) {
        setCart(items);
        setCartVersions(meta);
      } else {
        setCartVersions(meta);
      }
      setApiStatus(function (prev) {
        return Object.assign({}, prev, {
          cart: 'ok'
        });
      });
    }).catch(function () {
      setApiStatus(function (prev) {
        return Object.assign({}, prev, {
          cart: 'error'
        });
      });
    });
  }

  // ── Khởi động: khôi phục phiên + load data ───────────────────────────
  React.useEffect(function () {
    var cancelled = false;
    async function initAuth() {
      var u = null;
      if (window.UitAuth) {
        try {
          u = await window.UitAuth.handleCallback();
        } catch (err) {
          console.warn('[UIT Store] Auth callback:', err);
        }

        // Khôi phục phiên nếu token còn hạn trong sessionStorage
        if (!u && window.UitAuth.isAuthenticated()) {
          u = window.UitAuth.getUser();
        }
      }
      if (!cancelled && u) {
        setUser(u);
        window.UitAPI.setUserId(u.id || u.email);
      }
      if (!cancelled) {
        loadData();
      }
    }
    initAuth();
    return function () {
      cancelled = true;
    };
  }, []);
  const nav = (target, id) => {
    const authRequiredScreens = ['cart', 'checkout', 'account', 'orders'];
    if (authRequiredScreens.includes(target) && !user) {
      setScreen('login');
      toast('Vui lòng đăng nhập để tiếp tục.');
      return;
    }
    setScreen(target);
    if (target === 'order' && id) setRealOrderId(id);else if (target === 'checkout' && id && Array.isArray(id)) setCheckoutIds(id);else if (id) setProductId(id);else if (target === 'product' && !productId) {
      const first = window.PRODUCTS && window.PRODUCTS[0];
      if (first) setProductId(first.id);
    }
    setTimeout(() => {
      window.scrollTo(0, 0);
      const root = document.querySelector('.app-content');
      if (root) root.scrollTop = 0;
    }, 0);
  };
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  // ── Đồng bộ thêm item với Cart Service (background, non-blocking) ───
  const syncCartAdd = React.useCallback(function (product, qty) {
    if (!user) return;
    const merchantId = product.merchant_id;
    const currentMeta = cartVersions[merchantId];
    const version = currentMeta ? currentMeta.version : 1;
    const doAdd = function (ver) {
      return window.UitAPI.cart.addItem(merchantId, {
        cart_version: ver,
        product_id: product.id,
        quantity: qty,
        unit_price_snapshot: product.base_price,
        product_name_snapshot: product.name
      }).then(function (res) {
        const cartData = res && res.data;
        if (cartData) {
          setCartVersions(function (prev) {
            const next = Object.assign({}, prev);
            next[merchantId] = {
              cartId: cartData.id,
              version: cartData.version
            };
            return next;
          });
        }
        setApiStatus(function (prev) {
          return Object.assign({}, prev, {
            cart: 'ok'
          });
        });
      });
    };
    doAdd(version).catch(function (err) {
      // Version conflict → refresh cart rồi retry
      if (err.status === 409 || err.status === 400) {
        window.UitAPI.cart.list().then(function (res) {
          const carts = res && res.data;
          if (!carts) return;
          const mc = carts.find(function (c) {
            return c.merchant_id === merchantId;
          });
          if (mc) {
            setCartVersions(function (prev) {
              const next = Object.assign({}, prev);
              next[merchantId] = {
                cartId: mc.id,
                version: mc.version
              };
              return next;
            });
            doAdd(mc.version).catch(function () {});
          }
        }).catch(function () {});
      }
      setApiStatus(function (prev) {
        return Object.assign({}, prev, {
          cart: 'error'
        });
      });
    });
  }, [cartVersions, user]);
  const handleAddToCart = (product, qty) => {
    if (!user) {
      nav('login');
      toast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
      return;
    }
    // 1. Cập nhật UI ngay lập tức
    const lineMeta = {
      merchantId: product.merchant_id,
      name: product.name,
      unitPrice: product.base_price
    };
    const existing = cart.find(c => c.productId === product.id);
    if (existing) {
      setCart(cart.map(c => c.productId === product.id ? {
        ...c,
        qty: c.qty + qty,
        ...lineMeta
      } : c));
    } else {
      setCart([...cart, {
        productId: product.id,
        qty,
        ...lineMeta
      }]);
    }
    toast(`Đã thêm "${product.name.substring(0, 40)}..." vào giỏ`);

    // 2. Đồng bộ với Cart Service
    syncCartAdd(product, qty);
  };
  const handleBuyNow = (product, qty) => {
    if (!user) {
      nav('login');
      toast('Vui lòng đăng nhập để mua hàng.');
      return;
    }
    handleAddToCart(product, qty);
    nav('cart');
  };

  // ── Build checkout payload ───────────────────────────────────────────
  const buildCheckoutPayload = React.useCallback(async function (paymentMethod, deliveryFee, checkoutAddress) {
    if (!user) {
      throw new Error('Vui lòng đăng nhập trước khi thanh toán.');
    }
    const filteredCart = checkoutIds ? cart.filter(c => checkoutIds.includes(c.productId)) : cart;
    const items = filteredCart.map(function (c) {
      const product = window.UitAPI.productFromCartLine ? window.UitAPI.productFromCartLine(c) : (window.PRODUCTS || []).find(function (p) {
        return p.id === c.productId;
      });
      if (!product) return null;
      return {
        product_id: product.id,
        variant_id: null,
        merchant_id: product.merchant_id,
        sku: product.sku,
        product_name: product.name,
        quantity: c.qty,
        unit_price: product.base_price
      };
    }).filter(Boolean);
    const subtotal = items.reduce(function (s, i) {
      return s + i.unit_price * i.quantity;
    }, 0);
    const shipping_fee = deliveryFee !== undefined ? deliveryFee : 0;
    const firstMerchantId = items.length > 0 ? items[0].merchant_id : 'unknown';
    var cartMeta = cartVersions[firstMerchantId];
    try {
      var res = await window.UitAPI.cart.list();
      var carts = res && res.data;
      if (carts && carts.length > 0) {
        var freshMeta = {};
        carts.forEach(function (c) {
          freshMeta[c.merchant_id] = {
            cartId: c.id,
            version: c.version
          };
        });
        setCartVersions(function (prev) {
          return Object.assign({}, prev, freshMeta);
        });
        cartMeta = freshMeta[firstMerchantId];
      }
    } catch (e) {
      // Cart Service không phản hồi
    }
    if (!cartMeta) {
      throw new Error('Giỏ hàng chưa được đồng bộ với server. Vui lòng kiểm tra đăng nhập và thử thêm lại sản phẩm vào giỏ.');
    }
    const cartId = cartMeta.cartId;
    const pmType = paymentMethod === 'credit_card' ? 'credit_card' : 'cod';
    const address = checkoutAddress || {};
    if (!address.full_name || !address.phone || !address.address_line1 || !address.city) {
      throw new Error('Vui lòng nhập đầy đủ tên, số điện thoại, địa chỉ và tỉnh/thành phố.');
    }
    return {
      cart_id: cartId,
      cart_version: cartMeta.version,
      payment_method_type: pmType,
      shipping_fee: shipping_fee,
      customer_note: null,
      items: items,
      shipping_address: {
        full_name: address.full_name,
        phone: address.phone,
        email: address.email || '',
        address_line1: address.address_line1,
        city: address.city,
        state_province: address.state_province || '',
        postal_code: address.postal_code || ''
      }
    };
  }, [cart, cartVersions, user]);

  // ── Gọi Order Service để đặt hàng ───────────────────────────────────
  const doCheckout = React.useCallback(function (payload) {
    const idempotencyKey = 'idem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    setLastOrderPayload(payload);
    return window.UitAPI.order.checkout(payload, idempotencyKey).then(function (res) {
      const orderNum = res && res.data && res.data.parent_order_number || null;
      const checkoutUrl = res && res.data && res.data.checkout_url || null;
      if (orderNum) setRealOrderId(orderNum);
      setApiStatus(function (prev) {
        return Object.assign({}, prev, {
          order: 'ok'
        });
      });
      setCart([]);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      nav('order');
    }).catch(function (err) {
      console.warn('[UIT Store] Order API:', err.message);
      setApiStatus(function (prev) {
        return Object.assign({}, prev, {
          order: 'error'
        });
      });
      alert('Order Service chưa tạo được đơn hàng: ' + err.message);
    });
  }, [cart, cartVersions]);
  const handlePay = async (paymentMethod, deliveryFee, checkoutAddress) => {
    try {
      const payload = await buildCheckoutPayload(paymentMethod, deliveryFee, checkoutAddress);
      const subtotal = (payload.items || []).reduce(function (s, i) {
        return s + i.unit_price * i.quantity;
      }, 0);
      setOrderTotal(subtotal + Number(payload.shipping_fee));
      doCheckout(payload);
    } catch (err) {
      alert('Lỗi xử lý thanh toán: ' + err.message);
      console.error(err);
    }
  };

  // Toast
  const [toastMsg, setToastMsg] = React.useState(null);
  const toast = msg => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };
  const tabUrls = {
    home: 'uitstore.vn/',
    product: `uitstore.vn/p/${productId}`,
    cart: 'uitstore.vn/checkout/cart',
    checkout: 'uitstore.vn/checkout/payment',
    order: realOrderId ? 'uitstore.vn/order/' + realOrderId : 'uitstore.vn/order',
    login: 'uitstore.vn/account/login',
    register: 'uitstore.vn/account/register',
    account: 'uitstore.vn/account',
    orders: 'uitstore.vn/account/orders',
    merchant: 'seller.uitstore.vn/dashboard'
  };
  const tabTitle = {
    home: 'UIT Store · Tốt & Nhanh',
    product: 'Chi tiết sản phẩm — UIT Store',
    cart: 'Giỏ hàng — UIT Store',
    checkout: 'Thanh toán — UIT Store',
    order: 'Đặt hàng thành công — UIT Store',
    login: 'Đăng nhập — UIT Store',
    register: 'Đăng ký — UIT Store',
    account: 'Tài khoản — UIT Store',
    orders: 'Đơn hàng của tôi — UIT Store',
    merchant: 'Seller Center — UIT Store'
  };
  React.useEffect(() => {
    document.title = tabTitle[screen];
  }, [screen]);
  React.useEffect(() => {
    const handleKeyDown = e => {
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

  // Khi user đăng nhập
  const handleLogin = u => {
    if (!u) {
      nav('login');
      toast('Đăng ký thành công. Vui lòng đăng nhập lại.');
      return;
    }
    setUser(u);
    if (u) window.UitAPI.setUserId(u.id || u.email || u.name);
    loadData();
    nav('home');
    toast('Đăng nhập thành công · Phiên JWT đã được tạo');
  };
  const handleLogout = () => {
    setUser(null);
    setCart([]);
    setCartVersions({});
    window.UitAPI.setUserId(null);
    if (window.UitAuth) window.UitAuth.logout();
    nav('home');
    toast('Đã đăng xuất');
  };
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState(null);
  const [wishlist, setWishlist] = React.useState([]);
  const handleToggleWishlist = productId => {
    const isIn = wishlist.includes(productId);
    setWishlist(isIn ? wishlist.filter(id => id !== productId) : [...wishlist, productId]);
    toast(isIn ? 'Đã xoá khỏi yêu thích' : 'Đã thêm vào yêu thích ♥');
  };
  const handleSearch = q => {
    setSearchQuery(q);
    setActiveCategory(null);
    if (screen !== 'home') nav('home');
  };
  const handleCategory = catId => {
    setActiveCategory(catId);
    setSearchQuery('');
    if (screen !== 'home') nav('home');
  };
  const noHeaderScreens = ['login', 'register', 'merchant'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)'
    },
    className: "app-content"
  }, !noHeaderScreens.includes(screen) && /*#__PURE__*/React.createElement(Header, {
    nav: screen,
    cartCount: cartCount,
    onNav: nav,
    user: user,
    onLogout: handleLogout,
    onSearch: handleSearch,
    onCategory: handleCategory,
    onToast: toast
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }
  }, screen === 'home' && /*#__PURE__*/React.createElement(HomeScreen, {
    onProduct: id => nav('product', id),
    onNav: nav,
    apiStatus: apiStatus,
    productsVersion: productsVersion,
    searchQuery: searchQuery,
    activeCategory: activeCategory,
    onCategory: setActiveCategory
  }), screen === 'product' && /*#__PURE__*/React.createElement(ProductScreen, {
    productId: productId,
    onAddToCart: handleAddToCart,
    onBuyNow: handleBuyNow,
    onNav: nav,
    wishlist: wishlist,
    onToggleWishlist: handleToggleWishlist
  }), screen === 'cart' && /*#__PURE__*/React.createElement(CartScreen, {
    cart: cart,
    setCart: setCart,
    onNav: nav,
    user: user
  }), screen === 'checkout' && /*#__PURE__*/React.createElement(CheckoutScreen, {
    cart: checkoutIds ? cart.filter(c => checkoutIds.includes(c.productId)) : cart,
    onNav: nav,
    onPay: handlePay,
    user: user
  }), screen === 'order' && /*#__PURE__*/React.createElement(OrderScreen, {
    orderTotal: orderTotal,
    orderId: realOrderId,
    orderPayload: lastOrderPayload,
    user: user,
    onNav: nav
  }), screen === 'orders' && /*#__PURE__*/React.createElement(OrdersScreen, {
    onNav: nav,
    user: user
  }), screen === 'account' && /*#__PURE__*/React.createElement(AccountScreen, {
    user: user,
    onNav: nav,
    onLogout: handleLogout
  }), screen === 'login' && /*#__PURE__*/React.createElement(LoginScreen, {
    onLogin: handleLogin,
    onNav: nav
  }), screen === 'register' && /*#__PURE__*/React.createElement(RegisterScreen, {
    onLogin: handleLogin,
    onNav: nav
  }), screen === 'merchant' && /*#__PURE__*/React.createElement(MerchantScreen, {
    onNav: nav,
    user: user,
    setUser: setUser
  })), !noHeaderScreens.includes(screen) && screen !== 'order' && /*#__PURE__*/React.createElement(Footer, null), showNav && /*#__PURE__*/React.createElement("div", {
    className: "floating-nav",
    style: {
      position: 'fixed',
      bottom: 18,
      right: 18,
      zIndex: 90,
      background: 'var(--ink-900)',
      color: 'white',
      borderRadius: 30,
      padding: '6px 6px 6px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxShadow: 'var(--shadow-lg)',
      fontSize: 12,
      flexWrap: 'wrap',
      maxWidth: 'calc(100vw - 36px)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.7,
      marginRight: 4
    },
    className: "floating-nav-label hide-mobile"
  }, "Kh\xE1m ph\xE1:"), [{
    id: 'home',
    label: 'Trang chủ'
  }, {
    id: 'product',
    label: 'Sản phẩm'
  }, {
    id: 'cart',
    label: 'Giỏ hàng'
  }, {
    id: 'checkout',
    label: 'Thanh toán'
  }, {
    id: 'order',
    label: 'Đặt hàng OK'
  }, {
    id: 'login',
    label: 'Đăng nhập'
  }, {
    id: 'register',
    label: 'Đăng ký'
  }, {
    id: 'account',
    label: 'Tài khoản'
  }, {
    id: 'orders',
    label: 'Đơn hàng'
  }, {
    id: 'merchant',
    label: 'Seller'
  }].map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => nav(t.id),
    style: {
      padding: '5px 11px',
      borderRadius: 16,
      background: screen === t.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
      color: 'white',
      fontWeight: 500,
      fontSize: 11
    }
  }, t.label))), toastMsg && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 95,
      background: 'var(--ink-900)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: 'var(--shadow-lg)',
      fontSize: 13,
      animation: 'slide-in 0.25s ease-out',
      maxWidth: 360
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check-circle",
    size: 18,
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement("span", null, toastMsg)));
};
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
