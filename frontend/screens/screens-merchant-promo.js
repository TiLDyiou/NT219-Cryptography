// UIT Store — Merchant Promotions Section

const MerchantPromoSection = ({
  merchantId,
  user
}) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [vouchers, setVouchers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [busy, setBusy] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const [form, setForm] = React.useState({
    code: '',
    type: 'percent',
    value: 10,
    min_order: 200000,
    quantity: 100,
    expires_at: '2026-12-31'
  });
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
  const showMsg = (msg, ok) => {
    setNotice({
      msg,
      ok: ok !== false
    });
    setTimeout(() => setNotice(null), 3000);
  };
  const load = () => {
    if (!BASE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${BASE}/api/v1/promo/merchant/vouchers?merchant_id=${merchantId}`, {
      headers: hdr()
    }).then(r => r.json()).then(d => {
      setVouchers(d && d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  React.useEffect(load, [merchantId]);
  const handleCreate = () => {
    if (!form.code.trim()) {
      showMsg('Nhập mã voucher', false);
      return;
    }
    setBusy('create');
    const body = {
      ...form,
      merchant_id: merchantId,
      expires_at: form.expires_at + 'T23:59:59Z'
    };
    fetch(`${BASE}/api/v1/promo/merchant/vouchers`, {
      method: 'POST',
      headers: hdr(),
      body: JSON.stringify(body)
    }).then(r => r.json()).then(d => {
      if (d && d.data) {
        setVouchers(vs => [d.data, ...vs]);
        setShowForm(false);
        setForm({
          code: '',
          type: 'percent',
          value: 10,
          min_order: 200000,
          quantity: 100,
          expires_at: '2026-12-31'
        });
        showMsg('Tạo voucher thành công');
      } else {
        showMsg(d.error && d.error.message || 'Lỗi tạo voucher', false);
      }
    }).catch(() => showMsg('Lỗi kết nối', false)).finally(() => setBusy(null));
  };
  const handleToggle = v => {
    setBusy(v.id);
    fetch(`${BASE}/api/v1/promo/merchant/vouchers/${v.id}/toggle`, {
      method: 'PUT',
      headers: hdr(),
      body: JSON.stringify({
        merchant_id: merchantId
      })
    }).then(r => r.json()).then(d => {
      if (d && d.data) setVouchers(vs => vs.map(x => x.id === v.id ? d.data : x));
    }).catch(() => showMsg('Lỗi kết nối', false)).finally(() => setBusy(null));
  };
  const typeLabel = {
    percent: '% giảm',
    fixed: 'Giảm cố định',
    shipping: 'Free ship'
  };
  const fmtVND = n => new Intl.NumberFormat('vi-VN').format(n) + '₫';
  const fmtExp = s => new Date(s).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const isExpired = s => new Date(s) < new Date();
  const inp = {
    padding: '8px 10px',
    border: '1px solid var(--ink-200)',
    borderRadius: 6,
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box'
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 18,
      fontWeight: 600
    }
  }, "Khuy\u1EBFn m\xE3i & Voucher"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowForm(!showForm),
    className: "btn btn-primary",
    style: {
      padding: '7px 16px',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " T\u1EA1o voucher")), notice && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 12px',
      borderRadius: 6,
      marginBottom: 12,
      fontSize: 13,
      fontWeight: 500,
      background: notice.ok ? '#ECFDF5' : '#FEF2F2',
      color: notice.ok ? '#065F46' : '#991B1B',
      border: `1px solid ${notice.ok ? '#6EE7B7' : '#FECACA'}`
    }
  }, notice.msg), showForm && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 14,
      fontSize: 14
    }
  }, "T\u1EA1o voucher m\u1EDBi"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "M\xE3 voucher *"), /*#__PURE__*/React.createElement("input", {
    style: inp,
    value: form.code,
    onChange: e => setForm(f => ({
      ...f,
      code: e.target.value.toUpperCase()
    })),
    placeholder: "VD: SUMMER20"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "Lo\u1EA1i gi\u1EA3m gi\xE1"), /*#__PURE__*/React.createElement("select", {
    style: inp,
    value: form.type,
    onChange: e => setForm(f => ({
      ...f,
      type: e.target.value
    }))
  }, /*#__PURE__*/React.createElement("option", {
    value: "percent"
  }, "Ph\u1EA7n tr\u0103m (%)"), /*#__PURE__*/React.createElement("option", {
    value: "fixed"
  }, "S\u1ED1 ti\u1EC1n c\u1ED1 \u0111\u1ECBnh (\u20AB)"), /*#__PURE__*/React.createElement("option", {
    value: "shipping"
  }, "Mi\u1EC5n ph\xED v\u1EADn chuy\u1EC3n"))), form.type !== 'shipping' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "Gi\xE1 tr\u1ECB gi\u1EA3m ", form.type === 'percent' ? '(%)' : '(₫)'), /*#__PURE__*/React.createElement("input", {
    style: inp,
    type: "number",
    value: form.value,
    onChange: e => setForm(f => ({
      ...f,
      value: +e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "\u0110\u01A1n t\u1ED1i thi\u1EC3u (\u20AB)"), /*#__PURE__*/React.createElement("input", {
    style: inp,
    type: "number",
    value: form.min_order,
    onChange: e => setForm(f => ({
      ...f,
      min_order: +e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "S\u1ED1 l\u01B0\u1EE3ng"), /*#__PURE__*/React.createElement("input", {
    style: inp,
    type: "number",
    value: form.quantity,
    onChange: e => setForm(f => ({
      ...f,
      quantity: +e.target.value
    }))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "H\u1EBFt h\u1EA1n"), /*#__PURE__*/React.createElement("input", {
    style: inp,
    type: "date",
    value: form.expires_at,
    onChange: e => setForm(f => ({
      ...f,
      expires_at: e.target.value
    }))
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleCreate,
    disabled: busy === 'create',
    className: "btn btn-primary",
    style: {
      padding: '7px 18px',
      fontSize: 13
    }
  }, busy === 'create' ? 'Đang tạo…' : 'Tạo voucher'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowForm(false),
    className: "btn btn-outline",
    style: {
      padding: '7px 14px',
      fontSize: 13
    }
  }, "Hu\u1EF7"))), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: 'center',
      color: 'var(--ink-400)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "spinner",
    style: {
      width: 28,
      height: 28,
      margin: '0 auto 10px'
    }
  }), "\u0110ang t\u1EA3i...") : vouchers.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 40,
      textAlign: 'center',
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "tag",
    size: 36,
    color: "var(--ink-300)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, "Ch\u01B0a c\xF3 voucher n\xE0o")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, vouchers.map(v => {
    const expired = isExpired(v.expires_at);
    const pct = v.quantity > 0 ? Math.round(v.used / v.quantity * 100) : 100;
    return /*#__PURE__*/React.createElement("div", {
      key: v.id,
      className: "card",
      style: {
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        opacity: !v.active || expired ? 0.6 : 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 48,
        height: 48,
        borderRadius: 10,
        background: 'var(--primary-tint)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "tag",
      size: 22,
      color: "var(--primary)"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontFamily: 'monospace',
        fontSize: 14
      }
    }, v.code), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        padding: '2px 7px',
        borderRadius: 10,
        fontWeight: 600,
        background: v.type === 'percent' ? '#EFF6FF' : v.type === 'shipping' ? '#ECFDF5' : '#FFF7ED',
        color: v.type === 'percent' ? '#2563EB' : v.type === 'shipping' ? '#059669' : '#EA580C'
      }
    }, v.type === 'percent' ? `-${v.value}%` : v.type === 'fixed' ? `-${fmtVND(v.value)}` : 'Free ship'), expired && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        padding: '2px 7px',
        borderRadius: 10,
        background: '#FEF2F2',
        color: '#DC2626',
        fontWeight: 600
      }
    }, "H\u1EBFt h\u1EA1n")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--ink-500)',
        marginTop: 3
      }
    }, "\u0110\u01A1n t\u1ED1i thi\u1EC3u ", fmtVND(v.min_order), " \xB7 H\u1EBFt h\u1EA1n ", fmtExp(v.expires_at)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 4,
        background: 'var(--ink-100)',
        borderRadius: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${Math.min(pct, 100)}%`,
        height: '100%',
        borderRadius: 2,
        background: pct >= 100 ? '#EF4444' : pct > 70 ? '#F59E0B' : 'var(--primary)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)',
        whiteSpace: 'nowrap'
      }
    }, v.used, "/", v.quantity, " \u0111\xE3 d\xF9ng"))), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleToggle(v),
      disabled: busy === v.id,
      style: {
        padding: '5px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        border: 'none',
        background: v.active ? '#FEF2F2' : '#ECFDF5',
        color: v.active ? '#DC2626' : '#059669'
      }
    }, busy === v.id ? '…' : v.active ? 'Tắt' : 'Bật'));
  })));
};
Object.assign(window, {
  MerchantPromoSection
});