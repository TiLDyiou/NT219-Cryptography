// UIT Store — Cart, Checkout, Order tracking

// ─── Cart Screen ─────────────────────────────────────────────────────
const CartScreen = ({
  cart,
  setCart,
  onNav,
  user
}) => {
  const resolveProduct = c => window.UitAPI && window.UitAPI.productFromCartLine ? window.UitAPI.productFromCartLine(c) : window.PRODUCTS.find(p => p.id === c.productId);
  const items = cart.map(c => ({
    ...c,
    product: resolveProduct(c)
  })).filter(i => i.product);
  const [selected, setSelected] = React.useState(() => items.map(i => i.productId));

  // Sync selected when items list changes
  React.useEffect(() => {
    setSelected(prev => {
      const ids = items.map(i => i.productId);
      // keep existing selected that are still in cart, add new ones as selected
      const kept = prev.filter(id => ids.includes(id));
      const added = ids.filter(id => !prev.includes(id));
      return [...kept, ...added];
    });
  }, [cart.length]);
  const toggleSelect = productId => {
    setSelected(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };
  const toggleAll = () => {
    const allIds = items.map(i => i.productId);
    setSelected(selected.length === allIds.length ? [] : allIds);
  };
  const byMerchant = {};
  items.forEach(i => {
    const mid = i.product.merchant_id;
    if (!byMerchant[mid]) byMerchant[mid] = [];
    byMerchant[mid].push(i);
  });
  const selectedItems = items.filter(i => selected.includes(i.productId));
  const subtotal = selectedItems.reduce((s, i) => s + i.product.base_price * i.qty, 0);
  const ship = subtotal > 500000 ? 0 : subtotal > 0 ? 25000 : 0;
  const total = subtotal + ship;
  const updateQty = (productId, delta) => {
    setCart(cart.map(c => c.productId === productId ? {
      ...c,
      qty: Math.max(1, c.qty + delta)
    } : c));
  };
  const removeItem = productId => {
    setCart(cart.filter(c => c.productId !== productId));
  };
  if (items.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '60px 24px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'var(--ink-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "cart",
      size: 48,
      color: "var(--ink-400)"
    })), /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: '0 0 8px'
      }
    }, "Gi\u1ECF h\xE0ng \u0111ang tr\u1ED1ng"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: 'var(--ink-600)',
        marginBottom: 24
      }
    }, "H\xE3y th\xEAm s\u1EA3n ph\u1EA9m \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u mua s\u1EAFm nh\xE9!"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav('home'),
      className: "btn btn-primary"
    }, "Ti\u1EBFp t\u1EE5c mua s\u1EAFm"));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 24px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      margin: '4px 0 16px'
    }
  }, "Gi\u1ECF h\xE0ng ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-500)',
      fontWeight: 400,
      fontSize: 16
    }
  }, "(", items.length, " s\u1EA3n ph\u1EA9m)")), /*#__PURE__*/React.createElement("div", {
    className: "cart-grid"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(TrustStrip, null), /*#__PURE__*/React.createElement("div", {
    className: "card hide-mobile",
    style: {
      padding: '12px 16px',
      display: 'grid',
      gridTemplateColumns: '40px 1fr 100px 130px 100px 40px',
      gap: 12,
      alignItems: 'center',
      fontSize: 12,
      color: 'var(--ink-500)',
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: selected.length === items.length && items.length > 0,
    onChange: toggleAll
  }), /*#__PURE__*/React.createElement("span", null, "S\u1EA3n ph\u1EA9m (", selected.length, "/", items.length, " \u0111\xE3 ch\u1ECDn)"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center'
    }
  }, "\u0110\u01A1n gi\xE1"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center'
    }
  }, "S\u1ED1 l\u01B0\u1EE3ng"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "Th\xE0nh ti\u1EC1n"), /*#__PURE__*/React.createElement("span", null)), Object.entries(byMerchant).map(([mid, mitems]) => {
    const merchant = {
      name: mid || 'Catalog Merchant'
    };
    return /*#__PURE__*/React.createElement("div", {
      key: mid,
      className: "card",
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '10px 16px',
        background: 'var(--ink-100)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        borderBottom: '1px solid var(--ink-200)'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: mitems.every(it => selected.includes(it.productId)),
      onChange: () => {
        const mids = mitems.map(it => it.productId);
        const allSel = mids.every(id => selected.includes(id));
        setSelected(prev => allSel ? prev.filter(id => !mids.includes(id)) : [...new Set([...prev, ...mids])]);
      }
    }), /*#__PURE__*/React.createElement(Icon, {
      name: "shield-check",
      size: 14,
      color: "var(--primary)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, merchant.name), /*#__PURE__*/React.createElement("button", {
      style: {
        color: 'var(--primary)',
        fontSize: 12,
        marginLeft: 8
      },
      onClick: () => onNav('merchant')
    }, "Xem shop \u2192")), /*#__PURE__*/React.createElement("div", {
      className: "hide-mobile"
    }, mitems.map(item => /*#__PURE__*/React.createElement("div", {
      key: item.productId,
      style: {
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '40px 1fr 100px 130px 100px 40px',
        gap: 12,
        alignItems: 'center',
        borderBottom: '1px solid var(--ink-100)'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: selected.includes(item.productId),
      onChange: () => toggleSelect(item.productId)
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "ph-img",
      style: {
        width: 70,
        height: 70,
        flexShrink: 0,
        borderRadius: 4
      }
    }, item.product.brand), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.4,
        marginBottom: 6,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, item.product.name), item.product.color_options && item.product.color_options.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, "Ph\xE2n lo\u1EA1i: ", item.product.color_options[0]))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--price)',
        fontWeight: 700
      }
    }, window.formatVND(item.product.base_price))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--ink-200)',
        borderRadius: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => updateQty(item.productId, -1),
      style: {
        padding: '4px 8px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "minus",
      size: 11
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '0 12px',
        minWidth: 36,
        textAlign: 'center',
        borderLeft: '1px solid var(--ink-200)',
        borderRight: '1px solid var(--ink-200)',
        fontSize: 13
      }
    }, item.qty), /*#__PURE__*/React.createElement("button", {
      onClick: () => updateQty(item.productId, 1),
      style: {
        padding: '4px 8px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 11
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right',
        color: 'var(--price)',
        fontWeight: 700
      }
    }, window.formatVND(item.product.base_price * item.qty)), /*#__PURE__*/React.createElement("button", {
      onClick: () => removeItem(item.productId),
      style: {
        color: 'var(--ink-400)',
        padding: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 16
    }))))), /*#__PURE__*/React.createElement("div", {
      className: "show-mobile"
    }, mitems.map(item => /*#__PURE__*/React.createElement("div", {
      key: item.productId,
      className: "cart-item-mobile"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: selected.includes(item.productId),
      onChange: () => toggleSelect(item.productId),
      style: {
        marginTop: 4
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "ph-img",
      style: {
        width: 64,
        height: 64,
        flexShrink: 0,
        borderRadius: 4,
        fontSize: 10
      }
    }, item.product.brand), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.35,
        marginBottom: 4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, item.product.name), item.product.color_options && item.product.color_options.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)',
        marginBottom: 6
      }
    }, "Ph\xE2n lo\u1EA1i: ", item.product.color_options[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--price)',
        fontWeight: 700,
        fontSize: 14
      }
    }, window.formatVND(item.product.base_price)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--ink-200)',
        borderRadius: 4,
        background: 'white'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => updateQty(item.productId, -1),
      style: {
        padding: '2px 8px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "minus",
      size: 10
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '0 8px',
        minWidth: 24,
        textAlign: 'center',
        fontSize: 12
      }
    }, item.qty), /*#__PURE__*/React.createElement("button", {
      onClick: () => updateQty(item.productId, 1),
      style: {
        padding: '2px 8px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 10
    }))))), /*#__PURE__*/React.createElement("button", {
      onClick: () => removeItem(item.productId),
      style: {
        color: 'var(--ink-400)',
        padding: 4,
        marginLeft: 4
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 16
    }))))));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      position: 'sticky',
      top: 16,
      alignSelf: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 12,
      paddingBottom: 12,
      borderBottom: '1px solid var(--ink-100)'
    }
  }, "Giao t\u1EDBi"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, user ? user.name : 'Khách'), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-600)',
      marginTop: 4
    }
  }, "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 nh\u1EADn h\xE0ng \u1EDF b\u01B0\u1EDBc thanh to\xE1n."), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('checkout'),
    style: {
      marginTop: 8,
      color: 'var(--primary)',
      fontSize: 12,
      fontWeight: 500
    }
  }, "Nh\u1EADp \u0111\u1ECBa ch\u1EC9")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 8,
      background: 'var(--success-soft)',
      borderRadius: 4,
      fontSize: 11,
      color: 'var(--ink-700)',
      display: 'flex',
      gap: 6,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12,
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement("span", null, "\u0110\u1ECBa ch\u1EC9 \u0111\u01B0\u1EE3c ", /*#__PURE__*/React.createElement("b", null, "m\xE3 ho\xE1 field-level"), " trong DB qua Vault Transit"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, "T\u1EA1m t\xEDnh"), /*#__PURE__*/React.createElement("span", null, window.formatVND(subtotal))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, "Ph\xED v\u1EADn chuy\u1EC3n"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: ship === 0 ? 'var(--success)' : undefined
    }
  }, ship === 0 ? 'Miễn phí' : window.formatVND(ship))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--ink-200)',
      paddingTop: 10,
      marginTop: 4,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "T\u1ED5ng ti\u1EC1n"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--price)',
      fontSize: 22,
      fontWeight: 700
    }
  }, window.formatVND(total)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-500)'
    }
  }, "\u0110\xE3 bao g\u1ED3m VAT (n\u1EBFu c\xF3)")))), user ? /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('checkout'),
    className: "btn btn-price",
    disabled: selected.length === 0,
    style: {
      width: '100%',
      marginTop: 14,
      padding: '12px',
      fontSize: 14,
      opacity: selected.length === 0 ? 0.5 : 1
    }
  }, "Mua h\xE0ng (", selected.length, ")") : /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('login'),
    className: "btn btn-primary",
    style: {
      width: '100%',
      padding: '12px',
      fontSize: 14
    }
  }, "\u0110\u0103ng nh\u1EADp \u0111\u1EC3 thanh to\xE1n"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 11,
      color: 'var(--ink-500)',
      textAlign: 'center'
    }
  }, "Ch\u01B0a c\xF3 t\xE0i kho\u1EA3n?", ' ', /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--primary)',
      cursor: 'pointer'
    },
    onClick: () => window.UitAuth && window.UitAuth.register()
  }, "\u0110\u0103ng k\xFD ngay"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 11,
      color: 'var(--ink-500)',
      textAlign: 'center'
    }
  }, "B\u1EA5m \"Mua h\xE0ng\" \u0111\u1ED3ng ngh\u0129a b\u1EA1n \u0111\u1ED3ng \xFD v\u1EDBi ", /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--primary)'
    }
  }, "\u0110i\u1EC1u kho\u1EA3n UIT Store"))))));
};

// ─── Checkout Screen ─────────────────────────────────────────────────
const CheckoutScreen = ({
  cart,
  onNav,
  onPay,
  user
}) => {
  const [payment, setPayment] = React.useState('cod');
  const [delivery, setDelivery] = React.useState('fast');
  const [address, setAddress] = React.useState({
    full_name: user ? user.name || '' : '',
    phone: '',
    email: user ? user.email || '' : '',
    address_line1: '',
    city: '',
    state_province: '',
    postal_code: ''
  });

  // Tính ngày giao dự kiến động
  function addBizDays(date, n) {
    var d = new Date(date);
    var added = 0;
    while (added < n) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return d;
  }
  const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const fmtDate = d => DAY_NAMES[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
  const resolveProduct = c => window.UitAPI && window.UitAPI.productFromCartLine ? window.UitAPI.productFromCartLine(c) : window.PRODUCTS.find(p => p.id === c.productId);
  const items = cart.map(c => ({
    ...c,
    product: resolveProduct(c)
  })).filter(i => i.product);
  const subtotal = items.reduce((s, i) => s + i.product.base_price * i.qty, 0);
  const deliveryFee = delivery === 'instant' ? 35000 : subtotal > 500000 ? 0 : 25000;
  const ship = deliveryFee;
  const total = subtotal + ship;
  const paymentOptions = [{
    id: 'credit',
    label: 'Thẻ tín dụng / ghi nợ',
    desc: 'Gửi phương thức thanh toán sang Order Service',
    icon: 'credit-card'
  }, {
    id: 'momo',
    label: 'Ví MoMo',
    desc: 'Gửi phương thức thanh toán sang Order Service',
    icon: 'wallet'
  }, {
    id: 'vnpay',
    label: 'VNPay QR',
    desc: 'Gửi phương thức thanh toán sang Order Service',
    icon: 'qr'
  }, {
    id: 'transfer',
    label: 'Chuyển khoản ngân hàng',
    desc: 'Gửi phương thức thanh toán sang Order Service',
    icon: 'wallet'
  }, {
    id: 'cod',
    label: 'Thanh toán khi nhận hàng (COD)',
    desc: 'Gửi phương thức thanh toán sang Order Service',
    icon: 'truck'
  }];
  if (items.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '60px 24px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "cart",
      size: 44,
      color: "var(--ink-300)"
    }), /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: '12px 0 8px'
      }
    }, "Kh\xF4ng c\xF3 s\u1EA3n ph\u1EA9m h\u1EE3p l\u1EC7 \u0111\u1EC3 thanh to\xE1n"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: 'var(--ink-600)',
        marginBottom: 24
      }
    }, "Gi\u1ECF h\xE0ng c\u1EA7n \u0111\u01B0\u1EE3c \u0111\u1ED3ng b\u1ED9 v\u1EDBi Cart Service v\xE0 Catalog Service."), /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav('cart'),
      className: "btn btn-primary"
    }, "Quay l\u1EA1i gi\u1ECF h\xE0ng"));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 24px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18,
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      overflowX: 'auto'
    }
  }, [{
    num: 1,
    label: 'Giỏ hàng',
    done: true
  }, {
    num: 2,
    label: 'Thông tin & Thanh toán',
    active: true
  }, {
    num: 3,
    label: 'Hoàn tất',
    pending: true
  }].map((s, i, arr) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: s.num
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: s.done ? 'var(--success)' : s.active ? 'var(--primary)' : 'var(--ink-200)',
      color: s.pending ? 'var(--ink-500)' : 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 600
    }
  }, s.done ? /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14,
    color: "white"
  }) : s.num), /*#__PURE__*/React.createElement("span", {
    className: "stepper-label",
    style: {
      fontSize: 13,
      fontWeight: s.active ? 600 : 500,
      color: s.pending ? 'var(--ink-500)' : 'var(--ink-900)'
    }
  }, s.label)), i < arr.length - 1 && /*#__PURE__*/React.createElement("div", {
    className: "checkout-stepper-connector"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "checkout-grid"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifycontent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 15,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 16,
    color: "var(--primary)"
  }), " \u0110\u1ECBa ch\u1EC9 nh\u1EADn h\xE0ng")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "H\u1ECD t\xEAn ng\u01B0\u1EDDi nh\u1EADn *",
    value: address.full_name,
    onChange: e => setAddress({
      ...address,
      full_name: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i *",
    value: address.phone,
    onChange: e => setAddress({
      ...address,
      phone: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "Email",
    value: address.email,
    onChange: e => setAddress({
      ...address,
      email: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "T\u1EC9nh / th\xE0nh ph\u1ED1 *",
    value: address.city,
    onChange: e => setAddress({
      ...address,
      city: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "\u0110\u1ECBa ch\u1EC9 c\u1EE5 th\u1EC3 *",
    value: address.address_line1,
    onChange: e => setAddress({
      ...address,
      address_line1: e.target.value
    })
  })), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "Qu\u1EADn / huy\u1EC7n",
    value: address.state_province,
    onChange: e => setAddress({
      ...address,
      state_province: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "M\xE3 b\u01B0u ch\xEDnh",
    value: address.postal_code,
    onChange: e => setAddress({
      ...address,
      postal_code: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1',
      fontSize: 11,
      color: 'var(--ink-500)',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 11,
    color: "var(--success)"
  }), "Th\xF4ng tin giao h\xE0ng s\u1EBD \u0111\u01B0\u1EE3c g\u1EEDi sang Order Service."))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 14px',
      fontSize: 15,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 16,
    color: "var(--primary)"
  }), " Ph\u01B0\u01A1ng th\u1EE9c v\u1EADn chuy\u1EC3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, [{
    id: 'fast',
    label: 'Giao nhanh',
    sub: 'Nhận hàng ' + fmtDate(addBizDays(new Date(), 1)),
    price: 0,
    recommended: true
  }, {
    id: 'express',
    label: 'Giao tiết kiệm',
    sub: 'Nhận hàng ' + fmtDate(addBizDays(new Date(), 3)) + ' – ' + fmtDate(addBizDays(new Date(), 4)),
    price: 0
  }, {
    id: 'instant',
    label: 'Giao trong 2h',
    sub: 'Áp dụng nội thành TP. HCM',
    price: 35000
  }].map(d => /*#__PURE__*/React.createElement("label", {
    key: d.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      border: `1px solid ${delivery === d.id ? 'var(--primary)' : 'var(--ink-200)'}`,
      borderRadius: 6,
      cursor: 'pointer',
      background: delivery === d.id ? 'var(--primary-tint)' : 'white',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "delivery",
    checked: delivery === d.id,
    onChange: () => setDelivery(d.id)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 180
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, d.label, d.recommended && /*#__PURE__*/React.createElement("span", {
    className: "badge badge-success"
  }, "Khuy\xEAn d\xF9ng")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginTop: 2
    }
  }, d.sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: d.price === 0 ? 'var(--success)' : 'var(--ink-900)'
    }
  }, d.price === 0 ? 'Miễn phí' : window.formatVND(d.price)))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 14px',
      fontSize: 15,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "credit-card",
    size: 16,
    color: "var(--primary)"
  }), " Ph\u01B0\u01A1ng th\u1EE9c thanh to\xE1n"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, paymentOptions.map(p => /*#__PURE__*/React.createElement("label", {
    key: p.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      border: `1px solid ${payment === p.id ? 'var(--primary)' : 'var(--ink-200)'}`,
      borderRadius: 6,
      cursor: 'pointer',
      background: payment === p.id ? 'var(--primary-tint)' : 'white',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "payment",
    checked: payment === p.id,
    onChange: () => setPayment(p.id)
  }), /*#__PURE__*/React.createElement(Icon, {
    name: p.icon,
    size: 20,
    color: "var(--primary)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 180
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500
    }
  }, p.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginTop: 2
    }
  }, p.desc))))), payment === 'credit' && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      padding: 16,
      background: 'var(--ink-100)',
      borderRadius: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--success)',
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12,
    color: "var(--success)"
  }), /*#__PURE__*/React.createElement("span", null, "Frontend ch\u1EC9 g\u1EEDi payment_method_type sang Order Service. Ch\u01B0a c\xF3 endpoint backend \u0111\u1EC3 nh\u1EADp ho\u1EB7c tokenize th\u1EBB."))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      position: 'sticky',
      top: 16,
      alignSelf: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 12
    }
  }, "\u0110\u01A1n h\xE0ng (", items.length, " s\u1EA3n ph\u1EA9m)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxHeight: 220,
      overflow: 'auto'
    }
  }, items.map(i => /*#__PURE__*/React.createElement("div", {
    key: i.productId,
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ph-img",
    style: {
      width: 50,
      height: 50,
      flexShrink: 0,
      borderRadius: 4,
      fontSize: 9
    }
  }, i.product.brand), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      lineHeight: 1.3
    }
  }, i.product.name), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-500)',
      marginTop: 2
    }
  }, "x", i.qty)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--price)',
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }
  }, window.formatVND(i.product.base_price * i.qty)))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, "T\u1EA1m t\xEDnh"), /*#__PURE__*/React.createElement("span", null, window.formatVND(subtotal))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, "Ph\xED v\u1EADn chuy\u1EC3n"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: ship === 0 ? 'var(--success)' : undefined
    }
  }, ship === 0 ? 'Miễn phí' : window.formatVND(ship))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--ink-200)',
      paddingTop: 10,
      marginTop: 4,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "T\u1ED5ng ti\u1EC1n"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--price)',
      fontSize: 22,
      fontWeight: 700
    }
  }, window.formatVND(total)))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onPay(payment, deliveryFee, address),
    className: "btn btn-price",
    style: {
      width: '100%',
      marginTop: 14,
      padding: '12px',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 14,
    color: "white"
  }), " \u0110\u1EB7t h\xE0ng & Thanh to\xE1n"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 11,
      color: 'var(--ink-500)',
      textAlign: 'center',
      lineHeight: 1.5
    }
  }, "B\u1EB1ng vi\u1EC7c \u0111\u1EB7t h\xE0ng, b\u1EA1n \u0111\u1ED3ng \xFD v\u1EDBi ", /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--primary)'
    }
  }, "\u0110i\u1EC1u kho\u1EA3n d\u1ECBch v\u1EE5"), " c\u1EE7a UIT Store. Y\xEAu c\u1EA7u s\u1EBD \u0111\u01B0\u1EE3c g\u1EEDi sang Order Service.")))));
};

// ─── Order Success / Tracking ────────────────────────────────────────
const OrderScreen = ({
  orderTotal,
  orderId: realOrderId,
  orderPayload,
  user,
  onNav
}) => {
  if (!realOrderId || !orderPayload) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '60px 24px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "package",
      size: 44,
      color: "var(--ink-300)"
    }), /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: '12px 0 8px'
      }
    }, "Ch\u01B0a c\xF3 \u0111\u01A1n h\xE0ng t\u1EEB Order Service"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: 'var(--ink-600)',
        marginBottom: 24
      }
    }, "Trang n\xE0y ch\u1EC9 hi\u1EC3n th\u1ECB sau khi backend t\u1EA1o \u0111\u01A1n h\xE0ng th\xE0nh c\xF4ng."), /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav('home'),
      className: "btn btn-primary"
    }, "V\u1EC1 trang ch\u1EE7"));
  }
  const orderId = realOrderId;
  const items = orderPayload && orderPayload.items || [];
  const addr = orderPayload && orderPayload.shipping_address || {};
  const pm = orderPayload && orderPayload.payment_method_type || 'cod';
  const total = orderTotal || orderPayload && orderPayload.items.reduce(function (s, i) {
    return s + i.unit_price * i.quantity;
  }, 0) + (orderPayload.shipping_fee || 0) || 0;
  const ts = new Date();

  // Tính ngày giao dự kiến: +3 ngày làm việc
  function addBusinessDays(date, days) {
    var d = new Date(date);
    var added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return d;
  }
  const deliveryDate = addBusinessDays(ts, 3);
  const fmtDate = function (d) {
    var days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
  };
  const pmLabel = {
    credit_card: 'Thẻ tín dụng / ghi nợ',
    cod: 'Thanh toán khi nhận hàng',
    e_wallet: 'Ví điện tử'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px',
      maxWidth: 900,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: '32px 28px',
      textAlign: 'center',
      marginBottom: 16,
      background: 'linear-gradient(180deg, #E8F7EE 0%, white 60%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: '50%',
      background: 'var(--success)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      boxShadow: '0 8px 24px rgba(22, 163, 74, 0.3)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 40,
    color: "white",
    stroke: 3
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 6px',
      fontSize: 22
    }
  }, "\u0110\u1EB7t h\xE0ng th\xE0nh c\xF4ng!"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--ink-600)',
      margin: '0 0 18px'
    }
  }, "C\u1EA3m \u01A1n ", /*#__PURE__*/React.createElement("b", null, addr.full_name || 'bạn'), " \u0111\xE3 mua s\u1EAFm t\u1EA1i UIT Store."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      gap: 24,
      padding: '14px 24px',
      flexWrap: 'wrap',
      justifyContent: 'center',
      background: 'white',
      borderRadius: 8,
      border: '1px solid var(--ink-200)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-500)',
      fontSize: 11
    }
  }, "M\xE3 \u0111\u01A1n h\xE0ng"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontFamily: 'monospace',
      color: 'var(--primary)'
    }
  }, orderId)), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      background: 'var(--ink-200)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-500)',
      fontSize: 11
    }
  }, "T\u1ED5ng ti\u1EC1n"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: 'var(--price)'
    }
  }, window.formatVND(total))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      background: 'var(--ink-200)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-500)',
      fontSize: 11
    }
  }, "Thanh to\xE1n"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700
    }
  }, pmLabel[pm] || pm)), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      background: 'var(--ink-200)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-500)',
      fontSize: 11
    }
  }, "D\u1EF1 ki\u1EBFn nh\u1EADn"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700
    }
  }, fmtDate(deliveryDate))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 16,
      marginBottom: 16
    }
  }, items.length > 0 && /*#__PURE__*/React.createElement("div", {
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
  }, "S\u1EA3n ph\u1EA9m \u0111\xE3 \u0111\u1EB7t (", items.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, items.map(function (item, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 6,
        background: 'var(--primary-tint)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--primary)'
      }
    }, item.quantity, "x"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, item.product_name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, item.sku)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--price)',
        flexShrink: 0
      }
    }, window.formatVND(item.unit_price * item.quantity)));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--ink-100)',
      paddingTop: 8,
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-500)'
    }
  }, "Ph\xED ship"), /*#__PURE__*/React.createElement("span", null, orderPayload && orderPayload.shipping_fee === 0 ? 'Miễn phí' : window.formatVND(orderPayload && orderPayload.shipping_fee || 25000))))), /*#__PURE__*/React.createElement("div", {
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
  }, "\u0110\u1ECBa ch\u1EC9 giao h\xE0ng"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.7,
      color: 'var(--ink-700)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, addr.full_name || '—'), /*#__PURE__*/React.createElement("div", null, addr.phone || ''), /*#__PURE__*/React.createElement("div", null, addr.email || ''), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-500)',
      marginTop: 4,
      fontSize: 12
    }
  }, [addr.address_line1, addr.city, addr.state_province].filter(Boolean).join(', '))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 24,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 18px',
      fontSize: 15,
      fontWeight: 600
    }
  }, "Ti\u1EBFn tr\xECnh \u0111\u01A1n h\xE0ng"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      height: 2,
      background: 'var(--ink-200)',
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 16,
      left: 16,
      width: '12.5%',
      height: 2,
      background: 'var(--success)',
      zIndex: 0
    }
  }), [{
    label: 'Đã đặt hàng',
    sub: ts.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    done: true,
    active: false
  }, {
    label: 'Đã xác nhận',
    sub: 'Trong 30 phút',
    done: false,
    active: true
  }, {
    label: 'Đang đóng gói',
    sub: 'Trong 2-3h',
    done: false,
    active: false
  }, {
    label: 'Giao ĐVVC',
    sub: 'Trước 18h hôm nay',
    done: false,
    active: false
  }, {
    label: 'Đang giao',
    sub: fmtDate(addBusinessDays(ts, 2)),
    done: false,
    active: false
  }, {
    label: 'Đã giao',
    sub: fmtDate(deliveryDate),
    done: false,
    active: false
  }].map(function (s, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: s.done ? 'var(--success)' : s.active ? 'var(--primary)' : 'white',
        border: '2px solid ' + (s.done ? 'var(--success)' : s.active ? 'var(--primary)' : 'var(--ink-300)'),
        color: s.done || s.active ? 'white' : 'var(--ink-400)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600
      }
    }, s.done ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14,
      color: "white"
    }) : i + 1), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: s.done || s.active ? 600 : 400,
        color: s.done || s.active ? 'var(--ink-900)' : 'var(--ink-500)'
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'var(--ink-500)',
        marginTop: 2
      }
    }, s.sub));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 6px',
      fontSize: 15,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 16,
    color: "var(--primary)"
  }), " Th\xF4ng tin t\u1EEB Order Service"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 14
    }
  }, "\u0110\u01A1n h\xE0ng ch\u1EC9 hi\u1EC3n th\u1ECB sau khi backend t\u1EA1o th\xE0nh c\xF4ng."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      background: '#0F172A',
      borderRadius: 6,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      color: '#E2E8F0',
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94A3B8'
    }
  }, "endpoint"), " ", window.UitAPI.backendUrl + '/api/v1/orders/user/orders/checkout'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94A3B8'
    }
  }, "order_id"), " ", orderId), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94A3B8'
    }
  }, "payment_method"), " ", pm), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94A3B8'
    }
  }, "items"), " ", items.length))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 16,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('home'),
    className: "btn btn-outline",
    style: {
      padding: '10px 24px'
    }
  }, "Ti\u1EBFp t\u1EE5c mua s\u1EAFm"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('orders'),
    className: "btn btn-primary",
    style: {
      padding: '10px 24px'
    }
  }, "Xem l\u1ECBch s\u1EED \u0111\u01A1n h\xE0ng")));
};

// ─── Orders Screen ────────────────────────────────────────────────────
const OrdersScreen = ({
  onNav,
  user
}) => {
  const [orders, setOrders] = React.useState(null); // null = loading
  const [error, setError] = React.useState('');
  React.useEffect(function () {
    if (!user) {
      onNav('login');
      return;
    }
    window.UitAPI.order.list().then(function (res) {
      setOrders(res && res.data || []);
    }).catch(function (err) {
      setOrders([]);
      setError('Lỗi kết nối tới Backend: ' + err.message);
    });
  }, []);
  const statusBadge = {
    pending: {
      label: 'Chờ xác nhận',
      color: '#F59E0B',
      bg: '#FEF3C7'
    },
    confirmed: {
      label: 'Đã xác nhận',
      color: '#3B82F6',
      bg: '#EFF6FF'
    },
    shipped: {
      label: 'Đang giao',
      color: '#8B5CF6',
      bg: '#F5F3FF'
    },
    delivered: {
      label: 'Đã giao',
      color: '#10B981',
      bg: '#ECFDF5'
    },
    cancelled: {
      label: 'Đã huỷ',
      color: '#EF4444',
      bg: '#FEF2F2'
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 680,
      margin: '32px auto',
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('account'),
    style: {
      color: 'var(--ink-500)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 14
  }), " T\xE0i kho\u1EA3n"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-300)'
    }
  }, "/"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600
    }
  }, "\u0110\u01A1n h\xE0ng c\u1EE7a t\xF4i")), error && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 12px',
      background: '#FEF3C7',
      border: '1px solid #FCD34D',
      borderRadius: 6,
      fontSize: 12,
      color: '#92400E',
      marginBottom: 14
    }
  }, error), orders === null && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 60,
      color: 'var(--ink-400)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "spinner",
    style: {
      width: 32,
      height: 32,
      margin: '0 auto 12px'
    }
  }), "\u0110ang t\u1EA3i \u0111\u01A1n h\xE0ng..."), orders && orders.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 48,
      textAlign: 'center',
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "package",
    size: 40,
    color: "var(--ink-300)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontSize: 15
    }
  }, "B\u1EA1n ch\u01B0a c\xF3 \u0111\u01A1n h\xE0ng n\xE0o"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('home'),
    className: "btn btn-primary",
    style: {
      marginTop: 16,
      padding: '10px 24px'
    }
  }, "B\u1EAFt \u0111\u1EA7u mua s\u1EAFm")), orders && orders.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, orders.map(function (o) {
    var badge = statusBadge[o.status] || statusBadge.pending;
    var date = new Date(o.created_at).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      className: "card",
      style: {
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: 'pointer'
      },
      onClick: () => onNav('order', o.id)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        borderRadius: 8,
        background: 'var(--primary-tint)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "package",
      size: 22,
      color: "var(--primary)"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14,
        fontFamily: 'monospace'
      }
    }, o.id), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--ink-500)',
        marginTop: 2
      }
    }, date, " \xB7 ", o.items_count || '?', " s\u1EA3n ph\u1EA9m")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: 'var(--price)',
        fontSize: 14
      }
    }, window.formatVND(o.total_amount)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4,
        padding: '2px 8px',
        borderRadius: 10,
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        background: badge.bg,
        color: badge.color
      }
    }, badge.label)));
  })));
};
Object.assign(window, {
  CartScreen,
  CheckoutScreen,
  OrderScreen,
  OrdersScreen
});
