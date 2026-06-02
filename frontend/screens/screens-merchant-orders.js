// UIT Store — Merchant Orders Section (Industrial Aesthetic)
// DFII Score: 14 (High impact, fits merchant context, highly feasible)
// Aesthetic: Industrial Utilitarian - stark contrast, monospace accents, data-dense.

const _ORDER_STATUS = {
  pending_payment: {
    label: 'CHỜ XÁC NHẬN',
    fg: '#000',
    bg: '#FFEB3B',
    br: '#000'
  },
  payment_processing: {
    label: 'CHỜ THANH TOÁN',
    fg: '#000',
    bg: '#FFEB3B',
    br: '#000'
  },
  confirmed: {
    label: 'ĐÃ XÁC NHẬN',
    fg: '#FFF',
    bg: '#000',
    br: '#000'
  },
  shipped: {
    label: 'ĐANG GIAO',
    fg: '#000',
    bg: '#00E5FF',
    br: '#000'
  },
  delivered: {
    label: 'ĐÃ GIAO',
    fg: '#FFF',
    bg: '#00C853',
    br: '#000'
  },
  cancelled: {
    label: 'ĐÃ HUỶ',
    fg: '#FFF',
    bg: '#D50000',
    br: '#000'
  }
};
const _PAYMENT_LABEL = {
  cod: 'COD',
  credit_card: 'CARD'
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
      alert('Chức năng đánh dấu này hiện cần thao tác thông qua API giao vận.');
      return;
    }
    setBusy(orderId);
    window.UitAPI.merchantOrders.confirm(orderId).then(() => {
      load();
      const lbl = _ORDER_STATUS[status] && _ORDER_STATUS[status].label;
      showNotice(`[SYS_ACK] Đơn ${orderId.substring(0, 8)} -> ${lbl}`, true);
      setBusy(null);
    }).catch(err => {
      alert(err.message || 'Lỗi hệ thống');
      setBusy(null);
    });
  };
  const filtered = tab === 'all' ? orders : orders.filter(o => o.status === tab);
  const TABS = [{
    id: 'all',
    label: 'TẤT CẢ'
  }, {
    id: 'pending_payment',
    label: 'CHỜ XÁC NHẬN'
  }, {
    id: 'payment_processing',
    label: 'CHỜ TT'
  }, {
    id: 'confirmed',
    label: 'ĐÃ XÁC NHẬN'
  }, {
    id: 'shipped',
    label: 'ĐANG GIAO'
  }, {
    id: 'delivered',
    label: 'ĐÃ GIAO'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#000',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderBottom: '3px solid #000',
      paddingBottom: 16,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 28,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '-0.02em'
    }
  }, "Workstation"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '"IBM Plex Mono", "Courier New", monospace',
      fontSize: 13,
      marginTop: 4,
      fontWeight: 600
    }
  }, "> ORDER_MANAGEMENT_PROTOCOL")), /*#__PURE__*/React.createElement("button", {
    onClick: load,
    style: {
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 700,
      border: '2px solid #000',
      background: '#fff',
      color: '#000',
      cursor: 'pointer',
      fontFamily: '"IBM Plex Mono", "Courier New", monospace'
    },
    onMouseOver: e => {
      e.target.style.background = '#000';
      e.target.style.color = '#fff';
    },
    onMouseOut: e => {
      e.target.style.background = '#fff';
      e.target.style.color = '#000';
    }
  }, "[SYNC_DATA]")), notice && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      marginBottom: 24,
      fontSize: 14,
      fontWeight: 600,
      background: notice.ok ? '#000' : '#D50000',
      color: '#fff',
      fontFamily: '"IBM Plex Mono", "Courier New", monospace'
    }
  }, "> ", notice.msg), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24
    }
  }, TABS.map(t => {
    const count = t.id === 'all' ? orders.length : orders.filter(o => o.status === t.id).length;
    const active = tab === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setTab(t.id),
      style: {
        padding: '8px 16px',
        fontSize: 12,
        fontWeight: 700,
        background: active ? '#000' : '#fff',
        color: active ? '#fff' : '#000',
        border: '2px solid #000',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: '"IBM Plex Mono", "Courier New", monospace'
      }
    }, t.label, /*#__PURE__*/React.createElement("span", {
      style: {
        background: active ? '#fff' : '#000',
        color: active ? '#000' : '#fff',
        padding: '2px 6px',
        fontSize: 11
      }
    }, count));
  })), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 48,
      textAlign: 'center',
      border: '2px dashed #000',
      fontWeight: 600,
      fontFamily: 'monospace'
    }
  }, "FETCHING_RECORDS...") : filtered.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 64,
      textAlign: 'center',
      border: '2px dashed #000'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 16
    }
  }, "\uD83D\uDCE6"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      textTransform: 'uppercase'
    }
  }, "No records found")) : /*#__PURE__*/React.createElement("div", {
    style: {
      border: '2px solid #000',
      borderBottom: 0
    }
  }, filtered.map(order => {
    const st = _ORDER_STATUS[order.status] || _ORDER_STATUS.pending_payment;
    const bsy = busy === order.id;
    const exp = expanded === order.id;
    const phone = order.shipping_address && order.shipping_address.phone || '';
    const maskedPhone = phone ? phone.slice(0, 3) + '****' + phone.slice(-3) : 'N/A';
    const canConfirm = ['pending_payment', 'payment_processing'].includes(order.status);
    return /*#__PURE__*/React.createElement("div", {
      key: order.id,
      style: {
        borderBottom: '2px solid #000'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => setExpanded(exp ? null : order.id),
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 140px 140px 150px',
        background: exp ? '#F4F4F0' : '#fff',
        cursor: 'pointer',
        transition: 'background 0.2s'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        borderRight: '2px solid #000'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 800
      }
    }, order.order_number), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 6px',
        background: st.bg,
        color: st.fg,
        border: `1px solid ${st.br}`,
        fontFamily: '"IBM Plex Mono", monospace'
      }
    }, st.label)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.5,
        color: '#000',
        fontWeight: 500
      }
    }, (order.items || []).map((item, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        paddingRight: 8
      }
    }, item.product_name || item.name || item.product_id), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'monospace',
        fontWeight: 700
      }
    }, "x", item.quantity))))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        borderRight: '2px solid #000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: 700,
        color: '#666',
        marginBottom: 4
      }
    }, "Customer"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600
      }
    }, order.shipping_address && order.shipping_address.name || order.user_id.substring(0, 8)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontFamily: 'monospace',
        marginTop: 4
      }
    }, maskedPhone)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        borderRight: '2px solid #000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: 700,
        color: '#666',
        marginBottom: 4
      }
    }, _PAYMENT_LABEL[order.payment_method_type] || order.payment_method_type), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800
      }
    }, window.formatVND(order.total_amount || 0))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: canConfirm ? '#FF3E00' : 'transparent'
      }
    }, canConfirm ? /*#__PURE__*/React.createElement("button", {
      onClick: e => {
        e.stopPropagation();
        updateStatus(order.id, 'confirmed');
      },
      disabled: bsy,
      style: {
        width: '100%',
        padding: '12px 0',
        background: '#000',
        color: '#fff',
        border: 'none',
        fontWeight: 800,
        cursor: 'pointer',
        fontFamily: '"IBM Plex Mono", monospace'
      }
    }, bsy ? 'WAIT...' : 'XÁC NHẬN') : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'monospace',
        color: '#666'
      }
    }, "NO_ACTION"))), exp && /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#000',
        color: '#fff',
        padding: 24,
        borderTop: '2px solid #000',
        fontFamily: '"IBM Plex Mono", monospace'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        color: '#aaa',
        fontSize: 11,
        marginBottom: 8
      }
    }, "[SYS_META]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.6
      }
    }, /*#__PURE__*/React.createElement("div", null, "ID: ", order.id), /*#__PURE__*/React.createElement("div", null, "DATE: ", new Date(order.created_at).toISOString()), /*#__PURE__*/React.createElement("div", null, "PARENT_REF: ", order.parent_order_id))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        color: '#aaa',
        fontSize: 11,
        marginBottom: 8
      }
    }, "[SHIPPING_LOGISTICS]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.6
      }
    }, order.shipping_address ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, "DEST: ", order.shipping_address.address_line1 || 'N/A'), /*#__PURE__*/React.createElement("div", null, "CITY: ", order.shipping_address.city || 'N/A')) : /*#__PURE__*/React.createElement("div", null, "DATA_UNAVAILABLE"))))));
  })));
};
Object.assign(window, {
  MerchantOrdersSection
});
