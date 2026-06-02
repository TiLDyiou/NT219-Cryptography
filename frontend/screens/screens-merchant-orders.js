// UIT Store — Merchant Orders Section
// Đồng bộ với design system chung (card, badge, var(--ink-*), Icon).

const _ORDER_STATUS = {
  pending_payment: {
    label: 'Chờ xác nhận',
    cls: 'badge-warn'
  },
  payment_processing: {
    label: 'Chờ thanh toán',
    cls: 'badge-warn'
  },
  payment_failed: {
    label: 'Thanh toán lỗi',
    cls: 'badge-price'
  },
  confirmed: {
    label: 'Đã xác nhận',
    cls: 'badge-primary'
  },
  processing: {
    label: 'Đang xử lý',
    cls: 'badge-primary'
  },
  ready_to_ship: {
    label: 'Chờ lấy hàng',
    cls: 'badge-primary'
  },
  shipped: {
    label: 'Đang giao',
    cls: 'badge-primary'
  },
  delivered: {
    label: 'Đã giao',
    cls: 'badge-success'
  },
  completed: {
    label: 'Hoàn tất',
    cls: 'badge-success'
  },
  cancelled: {
    label: 'Đã huỷ',
    cls: 'badge-ink'
  }
};
const _PAYMENT_LABEL = {
  cod: 'COD',
  credit_card: 'Thẻ'
};
const _resolveImg = url => window.UitAPI && window.UitAPI.resolveMediaUrl ? window.UitAPI.resolveMediaUrl(url) : url;

// Tra sản phẩm từ catalog đã nạp để có tên / ảnh khi đơn cũ không lưu snapshot.
const _catProduct = item => (window.PRODUCTS || []).find(p => p.id === item.product_id);
const _itemName = item => {
  if (item.product_name || item.name) return item.product_name || item.name;
  const p = _catProduct(item);
  return p && p.name || 'SP ' + String(item.product_id || '').substring(0, 8);
};
const _itemImg = item => {
  if (item.image_url) return _resolveImg(item.image_url);
  const p = _catProduct(item);
  if (p && window.UitAPI && window.UitAPI.productImageUrl) return window.UitAPI.productImageUrl(p);
  return null;
};
const _Thumb = ({
  item,
  size = 36
}) => {
  const img = _itemImg(item);
  return img ? /*#__PURE__*/React.createElement("img", {
    src: img,
    alt: _itemName(item),
    style: {
      width: size,
      height: size,
      borderRadius: 6,
      objectFit: 'cover',
      border: '1px solid var(--ink-200)',
      flexShrink: 0
    },
    onError: e => {
      e.target.style.visibility = 'hidden';
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "ph-img",
    style: {
      width: size,
      height: size,
      borderRadius: 6,
      flexShrink: 0
    }
  });
};
const MerchantOrdersSection = ({
  merchantId,
  user
}) => {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('all');
  const [expanded, setExpanded] = React.useState(null);
  const [busy, setBusy] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const showNotice = (msg, ok) => {
    setNotice({
      msg,
      ok: ok !== false
    });
    setTimeout(() => setNotice(null), 4000);
  };
  const load = () => {
    setLoading(true);
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    window.UitAPI.merchantOrders.list().then(d => {
      setOrders(Array.isArray(d.data) ? d.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  React.useEffect(() => {
    load();
  }, [merchantId]);
  const updateStatus = (orderId, status) => {
    if (status !== 'confirmed') {
      showNotice('Thao tác này cần xử lý qua API giao vận.', false);
      return;
    }
    setBusy(orderId);
    window.UitAPI.merchantOrders.confirm(orderId).then(() => {
      load();
      showNotice(`Đã xác nhận đơn ${orderId.substring(0, 8)}`, true);
      setBusy(null);
    }).catch(err => {
      showNotice(err.message || 'Lỗi hệ thống', false);
      setBusy(null);
    });
  };
  const filtered = tab === 'all' ? orders : orders.filter(o => o.status === tab);
  const TABS = [{
    id: 'all',
    label: 'Tất cả'
  }, {
    id: 'pending_payment',
    label: 'Chờ xác nhận'
  }, {
    id: 'payment_processing',
    label: 'Chờ thanh toán'
  }, {
    id: 'confirmed',
    label: 'Đã xác nhận'
  }, {
    id: 'shipped',
    label: 'Đang giao'
  }, {
    id: 'delivered',
    label: 'Đã giao'
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      flexWrap: 'wrap',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 18,
      fontWeight: 600
    }
  }, "Qu\u1EA3n l\xFD \u0111\u01A1n h\xE0ng"), /*#__PURE__*/React.createElement("button", {
    onClick: load,
    className: "btn btn-ghost",
    style: {
      padding: '6px 14px',
      fontSize: 12,
      border: '1px solid var(--ink-200)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "package",
    size: 13
  }), " L\xE0m m\u1EDBi")), notice && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      marginBottom: 12,
      borderRadius: 6,
      fontSize: 12,
      background: notice.ok ? '#ECFDF5' : '#FEF2F2',
      color: notice.ok ? '#059669' : '#DC2626',
      border: `1px solid ${notice.ok ? '#A7F3D0' : '#FCA5A5'}`
    }
  }, notice.msg), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16
    }
  }, TABS.map(t => {
    const count = t.id === 'all' ? orders.length : orders.filter(o => o.status === t.id).length;
    const active = tab === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setTab(t.id),
      style: {
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 20,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        border: active ? '1px solid var(--primary)' : '1px solid var(--ink-200)',
        background: active ? 'var(--primary-soft)' : 'white',
        color: active ? 'var(--primary)' : 'var(--ink-600)'
      }
    }, t.label, /*#__PURE__*/React.createElement("span", {
      style: {
        background: active ? 'var(--primary)' : 'var(--ink-200)',
        color: active ? 'white' : 'var(--ink-600)',
        borderRadius: 10,
        padding: '0 6px',
        fontSize: 11,
        fontWeight: 600
      }
    }, count));
  })), loading ? /*#__PURE__*/React.createElement("div", {
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
  }), "\u0110ang t\u1EA3i \u0111\u01A1n h\xE0ng...") : filtered.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 48,
      textAlign: 'center',
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-300)',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "package",
    size: 40
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, "Ch\u01B0a c\xF3 \u0111\u01A1n h\xE0ng n\xE0o")) : /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden',
      padding: 0
    }
  }, filtered.map(order => {
    const st = _ORDER_STATUS[order.status] || _ORDER_STATUS.pending_payment;
    const bsy = busy === order.id;
    const exp = expanded === order.id;
    const items = order.items || [];
    const phone = order.shipping_address && order.shipping_address.phone || '';
    const maskedPhone = phone ? phone.slice(0, 3) + '****' + phone.slice(-3) : '—';
    const custName = order.shipping_address && order.shipping_address.name || 'KH ' + String(order.user_id || '').substring(0, 8);
    const canConfirm = order.status === 'pending_payment';
    return /*#__PURE__*/React.createElement("div", {
      key: order.id,
      style: {
        borderBottom: '1px solid var(--ink-100)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => setExpanded(exp ? null : order.id),
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 150px 180px',
        gap: 12,
        padding: 16,
        cursor: 'pointer',
        alignItems: 'center',
        background: exp ? 'var(--primary-tint)' : 'white'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, order.order_number), /*#__PURE__*/React.createElement("span", {
      className: 'badge ' + st.cls
    }, st.label), /*#__PURE__*/React.createElement("span", {
      className: "badge badge-ink"
    }, _PAYMENT_LABEL[order.payment_method_type] || order.payment_method_type)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, items.slice(0, 2).map((item, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(_Thumb, {
      item: item,
      size: 34
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--ink-700)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1
      }
    }, _itemName(item)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)',
        fontFamily: 'JetBrains Mono, monospace',
        flexShrink: 0
      }
    }, "\xD7", item.quantity))), items.length > 2 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)',
        paddingLeft: 42
      }
    }, "+", items.length - 2, " s\u1EA3n ph\u1EA9m kh\xE1c"))), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: 600,
        color: 'var(--ink-500)',
        marginBottom: 2
      }
    }, "Kh\xE1ch h\xE0ng"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--ink-800)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, custName), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)',
        marginTop: 2,
        fontFamily: 'JetBrains Mono, monospace'
      }
    }, maskedPhone)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--price)'
      }
    }, window.formatVND(order.total_amount || 0)), canConfirm ? /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        updateStatus(order.id, 'confirmed');
      },
      disabled: bsy,
      className: "btn btn-primary",
      style: {
        padding: '6px 14px',
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    }), " ", bsy ? 'Đang xử lý...' : 'Xác nhận đơn') : /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: 'var(--ink-400)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        transform: exp ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-down",
      size: 14
    })), "Chi ti\u1EBFt"))), exp && /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--ink-100)',
        padding: 16,
        borderTop: '1px solid var(--ink-200)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'white',
        borderRadius: 8,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        textTransform: 'uppercase',
        fontWeight: 600,
        color: 'var(--ink-500)',
        marginBottom: 10
      }
    }, "S\u1EA3n ph\u1EA9m"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, items.map((item, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(_Thumb, {
      item: item,
      size: 44
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink-800)'
      }
    }, _itemName(item)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)',
        fontFamily: 'JetBrains Mono, monospace'
      }
    }, item.sku)), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--ink-700)'
      }
    }, window.formatVND(item.unit_price || 0), " \xD7 ", item.quantity), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--price)'
      }
    }, window.formatVND(item.line_total || 0))))))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'white',
        borderRadius: 8,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        textTransform: 'uppercase',
        fontWeight: 600,
        color: 'var(--ink-500)',
        marginBottom: 10
      }
    }, "Th\xF4ng tin \u0111\u01A1n"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: 12,
        color: 'var(--ink-700)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-500)'
      }
    }, "M\xE3 \u0111\u01A1n"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11
      }
    }, order.id)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-500)'
      }
    }, "Ng\xE0y \u0111\u1EB7t"), /*#__PURE__*/React.createElement("span", null, order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : '—')), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-500)'
      }
    }, "T\u1EA1m t\xEDnh"), /*#__PURE__*/React.createElement("span", null, window.formatVND(order.subtotal || 0))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-500)'
      }
    }, "Ph\xED v\u1EADn chuy\u1EC3n"), /*#__PURE__*/React.createElement("span", null, window.formatVND(order.shipping_fee || 0))), order.shipping_address && /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid var(--ink-100)',
        paddingTop: 8,
        marginTop: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--ink-500)',
        marginBottom: 2
      }
    }, "\u0110\u1ECBa ch\u1EC9 giao"), /*#__PURE__*/React.createElement("div", null, order.shipping_address.address_line1 || '—', order.shipping_address.city ? ', ' + order.shipping_address.city : '')))))));
  })));
};
Object.assign(window, {
  MerchantOrdersSection
});
