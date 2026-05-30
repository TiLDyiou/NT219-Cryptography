// UIT Store — Merchant Orders Section

const _ORDER_STATUS = {
  pending: {
    label: 'Chờ xác nhận',
    color: '#D97706',
    bg: '#FEF3C7'
  },
  confirmed: {
    label: 'Đã xác nhận',
    color: '#2563EB',
    bg: '#EFF6FF'
  },
  shipped: {
    label: 'Đang giao',
    color: '#7C3AED',
    bg: '#F5F3FF'
  },
  delivered: {
    label: 'Đã giao',
    color: '#059669',
    bg: '#ECFDF5'
  },
  cancelled: {
    label: 'Đã huỷ',
    color: '#DC2626',
    bg: '#FEF2F2'
  }
};
const _PAYMENT_LABEL = {
  cod: 'COD',
  credit: 'Thẻ TD',
  vnpay: 'VNPay',
  momo: 'MoMo'
};
const MerchantOrdersSection = ({
  merchantId,
  user
}) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('all');
  const [expanded, setExpanded] = React.useState(null);
  const [busy, setBusy] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
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
  const showNotice = (msg, ok) => {
    setNotice({
      msg,
      ok: ok !== false
    });
    setTimeout(() => setNotice(null), 3000);
  };
  const load = () => {
    setLoading(true);
    if (!BASE || !user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    fetch(`${BASE}/api/v1/orders/merchant/orders?merchant_id=${merchantId || ''}`, {
      headers: hdr()
    }).then(r => r.json()).then(d => {
      setOrders(Array.isArray(d.data) ? d.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  React.useEffect(() => {
    load();
  }, [merchantId]);
  const updateStatus = (orderId, status) => {
    setBusy(orderId);
    fetch(`${BASE}/api/v1/orders/merchant/orders/${orderId}/status`, {
      method: 'PUT',
      headers: hdr(),
      body: JSON.stringify({
        status
      })
    }).then(r => r.json()).then(() => {
      load();
      const lbl = _ORDER_STATUS[status] && _ORDER_STATUS[status].label;
      showNotice(`Đơn chuyển sang "${lbl}"`, true);
      setExpanded(null);
      setBusy(null);
    }).catch(() => setBusy(null));
  };
  const counts = key => orders.filter(o => o.status === key).length;
  const filtered = tab === 'all' ? orders : orders.filter(o => o.status === tab);
  const TABS = [{
    id: 'all',
    label: 'Tất cả'
  }, {
    id: 'pending',
    label: 'Chờ xác nhận'
  }, {
    id: 'confirmed',
    label: 'Đang xử lý'
  }, {
    id: 'shipped',
    label: 'Đang giao'
  }, {
    id: 'delivered',
    label: 'Đã giao'
  }, {
    id: 'cancelled',
    label: 'Đã huỷ'
  }];
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
  }, "Qu\u1EA3n l\xFD \u0111\u01A1n h\xE0ng"), /*#__PURE__*/React.createElement("button", {
    onClick: load,
    style: {
      padding: '6px 14px',
      fontSize: 12,
      border: '1px solid var(--ink-200)',
      borderRadius: 6,
      background: 'white'
    }
  }, "\u21BB L\xE0m m\u1EDBi")), notice && /*#__PURE__*/React.createElement("div", {
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
      gap: 0,
      marginBottom: 16,
      borderBottom: '2px solid var(--ink-100)'
    }
  }, TABS.map(t => {
    const c = t.id === 'all' ? orders.length : counts(t.id);
    const active = tab === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setTab(t.id),
      style: {
        padding: '8px 12px',
        fontSize: 12,
        background: 'transparent',
        color: active ? 'var(--primary)' : 'var(--ink-600)',
        borderBottom: `2px solid ${active ? 'var(--primary)' : 'transparent'}`,
        fontWeight: active ? 600 : 400,
        marginBottom: -2,
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }
    }, t.label, c > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        padding: '1px 5px',
        borderRadius: 8,
        background: active ? 'var(--primary)' : 'var(--ink-200)',
        color: active ? 'white' : 'var(--ink-600)'
      }
    }, c));
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
  }), "\u0110ang t\u1EA3i...") : filtered.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 40,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "package",
    size: 32,
    color: "var(--ink-300)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--ink-600)'
    }
  }, tab === 'pending' ? 'Không có đơn chờ xác nhận' : 'Chưa có đơn hàng nào'), tab === 'pending' && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-400)',
      marginTop: 4
    }
  }, "Khi kh\xE1ch \u0111\u1EB7t h\xE0ng s\u1EA3n ph\u1EA9m c\u1EE7a b\u1EA1n, \u0111\u01A1n s\u1EBD hi\u1EC7n \u1EDF \u0111\xE2y.")) : /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '150px 1fr 140px 110px 100px 140px',
      gap: 10,
      padding: '10px 16px',
      background: 'var(--ink-100)',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--ink-600)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "M\xE3 \u0111\u01A1n"), /*#__PURE__*/React.createElement("span", null, "S\u1EA3n ph\u1EA9m"), /*#__PURE__*/React.createElement("span", null, "Kh\xE1ch h\xE0ng"), /*#__PURE__*/React.createElement("span", null, "T\u1ED5ng ti\u1EC1n"), /*#__PURE__*/React.createElement("span", null, "Thanh to\xE1n"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center'
    }
  }, "Tr\u1EA1ng th\xE1i")), filtered.map(order => {
    const st = _ORDER_STATUS[order.status] || _ORDER_STATUS.pending;
    const exp = expanded === order.parent_order_number;
    const bsy = busy === order.parent_order_number;
    const phone = order.shipping_address && order.shipping_address.phone || '';
    const maskedPhone = phone ? phone.slice(0, 3) + '****' + phone.slice(-3) : '—';
    return /*#__PURE__*/React.createElement("div", {
      key: order.parent_order_number
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => setExpanded(exp ? null : order.parent_order_number),
      style: {
        display: 'grid',
        gridTemplateColumns: '150px 1fr 140px 110px 100px 140px',
        gap: 10,
        padding: '12px 16px',
        fontSize: 12,
        borderBottom: '1px solid var(--ink-100)',
        background: exp ? 'var(--primary-tint)' : 'white',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        color: 'var(--primary)',
        fontWeight: 600
      }
    }, order.parent_order_number), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'var(--ink-400)',
        marginTop: 2
      }
    }, new Date(order.created_at).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, (order.items || []).slice(0, 2).map((item, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 12,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, item.name || item.product_name_snapshot || item.product_id, item.quantity > 1 ? ` ×${item.quantity}` : '')), (order.items || []).length > 2 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'var(--ink-400)'
      }
    }, "+", order.items.length - 2, " sp kh\xE1c")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12
      }
    }, order.shipping_address && order.shipping_address.name || 'Khách hàng'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'var(--ink-400)',
        fontFamily: 'monospace'
      },
      title: "M\xE3 ho\xE1 field-level \xB7 Vault Transit"
    }, maskedPhone)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        color: 'var(--price)',
        fontSize: 12
      }
    }, window.formatVND(order.total_amount || 0)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, _PAYMENT_LABEL[order.payment_method_type] || order.payment_method_type), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        fontSize: 10,
        padding: '3px 8px',
        borderRadius: 10,
        background: st.bg,
        color: st.color,
        fontWeight: 600
      }
    }, st.label))), exp && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '12px 16px',
        background: '#F0F5FF',
        borderBottom: '2px solid var(--primary-soft)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--ink-700)',
        flex: 1,
        minWidth: 200
      }
    }, "Thao t\xE1c: ", /*#__PURE__*/React.createElement("b", {
      style: {
        fontFamily: 'monospace'
      }
    }, order.parent_order_number), order.shipping_address && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)',
        marginTop: 2
      }
    }, "\uD83D\uDCCD ", [order.shipping_address.address, order.shipping_address.city].filter(Boolean).join(', '))), order.status === 'pending' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => updateStatus(order.parent_order_number, 'confirmed'),
      disabled: bsy,
      className: "btn btn-primary",
      style: {
        padding: '6px 14px',
        fontSize: 12
      }
    }, bsy ? '...' : 'Xác nhận đơn'), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (window.confirm('Huỷ đơn hàng này?')) updateStatus(order.parent_order_number, 'cancelled');
      },
      disabled: bsy,
      style: {
        padding: '6px 14px',
        fontSize: 12,
        border: '1px solid #FCA5A5',
        borderRadius: 6,
        color: '#DC2626',
        background: 'white'
      }
    }, "Hu\u1EF7 \u0111\u01A1n")), order.status === 'confirmed' && /*#__PURE__*/React.createElement("button", {
      onClick: () => updateStatus(order.parent_order_number, 'shipped'),
      disabled: bsy,
      className: "btn btn-primary",
      style: {
        padding: '6px 14px',
        fontSize: 12
      }
    }, bsy ? '...' : 'Đánh dấu đang giao'), order.status === 'shipped' && /*#__PURE__*/React.createElement("button", {
      onClick: () => updateStatus(order.parent_order_number, 'delivered'),
      disabled: bsy,
      className: "btn btn-primary",
      style: {
        padding: '6px 14px',
        fontSize: 12
      }
    }, bsy ? '...' : 'Đã giao hàng'), ['delivered', 'cancelled'].includes(order.status) && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--ink-500)'
      }
    }, "\u0110\u01A1n h\xE0ng \u0111\xE3 k\u1EBFt th\xFAc.")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid var(--ink-200)',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--ink-400)'
      }
    }, "Backend ghi audit log sau khi c\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i. \xA0\xB7\xA0 S\u0110T kh\xE1ch: field-encrypted (Vault Transit)")));
  })));
};
Object.assign(window, {
  MerchantOrdersSection
});