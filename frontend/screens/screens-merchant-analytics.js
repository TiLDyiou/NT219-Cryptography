// UIT Store — Merchant Analytics Section

const MerchantAnalyticsSection = ({
  merchantId,
  user
}) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [orders, setOrders] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState(30);
  const hdr = () => {
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    return t ? {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + t
    } : {
      'Content-Type': 'application/json',
      'X-User-Id': user && user.id
    };
  };
  const load = () => {
    setLoading(true);
    if (!BASE || !user) {
      setOrders([]);
      setProducts([]);
      setLoading(false);
      return;
    }
    const qp = merchantId ? `?merchant_id=${merchantId}` : '';
    Promise.all([fetch(`${BASE}/api/v1/orders/merchant/orders${qp}`, {
      headers: hdr()
    }).then(r => r.json()), fetch(`${BASE}/api/v1/catalog/merchant/products${qp}`, {
      headers: hdr()
    }).then(r => r.json())]).then(([o, p]) => {
      setOrders(Array.isArray(o.data) ? o.data : []);
      setProducts(Array.isArray(p.data) ? p.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  React.useEffect(() => {
    load();
  }, [merchantId]);

  // Compute derived stats
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_amount || 0), 0);
  const pending = orders.filter(o => o.status === 'pending_payment' || o.status === 'payment_processing').length;
  const confirmed = orders.filter(o => o.status === 'confirmed').length;
  const shipped = orders.filter(o => o.status === 'shipped').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const cancelled = orders.filter(o => o.status === 'cancelled').length;

  // Top products by sold
  const productSales = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const pid = item.product_id;
      if (!productSales[pid]) productSales[pid] = {
        name: item.name || item.product_name_snapshot || pid,
        rev: 0,
        qty: 0
      };
      if (o.status === 'delivered') {
        productSales[pid].rev += (item.unit_price || 0) * (item.quantity || 1);
        productSales[pid].qty += item.quantity || 1;
      }
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.rev - a.rev).slice(0, 5);
  const maxRev = topProducts.length ? topProducts[0].rev : 1;

  // Order status distribution
  const statusDist = [{
    label: 'Chờ xác nhận',
    count: pending,
    color: '#D97706'
  }, {
    label: 'Đã xác nhận',
    count: confirmed,
    color: '#2563EB'
  }, {
    label: 'Đang giao',
    count: shipped,
    color: '#7C3AED'
  }, {
    label: 'Đã giao',
    count: delivered,
    color: '#059669'
  }, {
    label: 'Đã huỷ',
    count: cancelled,
    color: '#DC2626'
  }].filter(s => s.count > 0);
  const totalOrders = orders.length || 1;

  // Revenue by day (last 7 days, from orders)
  const today = new Date();
  const days7 = Array.from({
    length: 7
  }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const revenueByDay = days7.map(d => {
    const dStr = d.toISOString().slice(0, 10);
    const rev = orders.filter(o => o.status === 'delivered' && (o.created_at || '').startsWith(dStr)).reduce((s, o) => s + (o.total_amount || 0), 0);
    return {
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      rev
    };
  });
  const maxDayRev = Math.max(...revenueByDay.map(d => d.rev), 1);
  const cancelRate = orders.length ? (cancelled / orders.length * 100).toFixed(1) : '0.0';
  const deliverRate = orders.length ? (delivered / orders.length * 100).toFixed(1) : '0.0';
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 18,
      fontWeight: 600
    }
  }, "Ph\xE2n t\xEDch b\xE1n h\xE0ng"), /*#__PURE__*/React.createElement("button", {
    onClick: load,
    style: {
      padding: '6px 14px',
      fontSize: 12,
      border: '1px solid var(--ink-200)',
      borderRadius: 6,
      background: 'white'
    }
  }, "\u21BB L\xE0m m\u1EDBi")), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 48,
      color: 'var(--ink-400)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "spinner",
    style: {
      width: 28,
      height: 28,
      margin: '0 auto 10px',
      borderWidth: 3
    }
  }), "\u0110ang t\u1EA3i...") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12
    }
  }, [{
    l: 'Tổng đơn hàng',
    v: orders.length,
    c: 'var(--primary)'
  }, {
    l: 'Doanh thu đã giao',
    v: window.formatVND(totalRevenue),
    c: 'var(--success)'
  }, {
    l: 'Tỉ lệ giao thành công',
    v: deliverRate + '%',
    c: 'var(--success)'
  }, {
    l: 'Tỉ lệ huỷ đơn',
    v: cancelRate + '%',
    c: cancelled > 0 ? 'var(--price)' : 'var(--ink-700)'
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.l,
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-600)',
      marginBottom: 6
    }
  }, s.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: s.c
    }
  }, s.v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 14
    }
  }, "Doanh thu 7 ng\xE0y g\u1EA7n nh\u1EA5t"), revenueByDay.every(d => d.rev === 0) ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 32,
      color: 'var(--ink-400)',
      fontSize: 12
    }
  }, "Ch\u01B0a c\xF3 \u0111\u01A1n h\xE0ng \u0111\xE3 giao. Doanh thu s\u1EBD hi\u1EC3n th\u1ECB khi c\xF3 \u0111\u01A1n delivered.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      height: 140
    }
  }, revenueByDay.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      height: '100%',
      justifyContent: 'flex-end'
    }
  }, d.rev > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'var(--ink-500)',
      textAlign: 'center',
      lineHeight: 1.2
    }
  }, (d.rev / 1000).toFixed(0), "k"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      borderRadius: '3px 3px 0 0',
      height: `${Math.max(d.rev / maxDayRev * 110, d.rev > 0 ? 4 : 0)}px`,
      background: d.rev > 0 ? 'var(--primary)' : 'var(--ink-200)',
      minHeight: d.rev > 0 ? 4 : 2,
      transition: 'height 0.3s'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--ink-500)',
      whiteSpace: 'nowrap'
    }
  }, d.label))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 14
    }
  }, "Ph\xE2n b\u1ED1 tr\u1EA1ng th\xE1i"), statusDist.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 20,
      color: 'var(--ink-400)',
      fontSize: 12
    }
  }, "Ch\u01B0a c\xF3 \u0111\u01A1n") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, statusDist.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11,
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, s.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, s.count, " (", (s.count / totalOrders * 100).toFixed(0), "%)")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--ink-100)',
      borderRadius: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      borderRadius: 3,
      width: `${s.count / totalOrders * 100}%`,
      background: s.color,
      transition: 'width 0.4s'
    }
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 14
    }
  }, "Top s\u1EA3n ph\u1EA9m theo doanh thu (\u0111\u01A1n delivered)"), topProducts.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 24,
      color: 'var(--ink-400)',
      fontSize: 12
    }
  }, "D\u1EEF li\u1EC7u s\u1EBD xu\u1EA5t hi\u1EC7n sau khi c\xF3 \u0111\u01A1n h\xE0ng delivered.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, topProducts.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: '-webkit-box',
      WebkitLineClamp: 1,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      flex: 1
    }
  }, i + 1, ". ", p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: 'var(--success)',
      marginLeft: 10,
      whiteSpace: 'nowrap'
    }
  }, window.formatVND(p.rev), " \xB7 ", p.qty, " sp")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--ink-100)',
      borderRadius: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      borderRadius: 3,
      width: `${p.rev / maxRev * 100}%`,
      background: 'var(--primary)',
      transition: 'width 0.4s'
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-400)',
      textAlign: 'center',
      fontFamily: 'JetBrains Mono, monospace',
      padding: '4px 0'
    }
  }, "D\u1EEF li\u1EC7u t\u1ED5ng h\u1EE3p t\u1EEB ", orders.length, " \u0111\u01A1n h\xE0ng \xB7 ", products.length, " s\u1EA3n ph\u1EA9m t\u1EEB backend")));
};
Object.assign(window, {
  MerchantAnalyticsSection
});
