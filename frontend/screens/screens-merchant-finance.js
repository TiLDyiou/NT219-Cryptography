// UIT Store — Merchant Finance Section

const MerchantFinanceSection = ({
  merchantId,
  user
}) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [balance, setBalance] = React.useState(null);
  const [txns, setTxns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showWithdraw, setShowWithdraw] = React.useState(false);
  const [wAmount, setWAmount] = React.useState('');
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
  const load = () => {
    setLoading(true);
    if (!BASE || !user) {
      setBalance(null);
      setTxns([]);
      setLoading(false);
      return;
    }
    const qp = merchantId ? `?merchant_id=${merchantId}` : '';
    Promise.all([fetch(`${BASE}/api/v1/finance/merchant/balance${qp}`, {
      headers: hdr()
    }).then(r => r.json()), fetch(`${BASE}/api/v1/finance/merchant/transactions${qp}`, {
      headers: hdr()
    }).then(r => r.json())]).then(([b, t]) => {
      setBalance(b.data || null);
      setTxns(Array.isArray(t.data) ? t.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  React.useEffect(() => {
    load();
  }, [merchantId]);
  const doWithdraw = () => {
    const amt = Number(wAmount);
    if (!amt || amt <= 0) return;
    fetch(`${BASE}/api/v1/finance/merchant/withdraw`, {
      method: 'POST',
      headers: hdr(),
      body: JSON.stringify({
        amount: amt,
        merchant_id: merchantId
      })
    }).then(r => r.json()).then(() => {
      setNotice({
        msg: `Yêu cầu rút ${window.formatVND(amt)} đã gửi. Xử lý 1-3 ngày làm việc.`,
        ok: true
      });
      setShowWithdraw(false);
      setWAmount('');
      load();
      setTimeout(() => setNotice(null), 5000);
    });
  };
  const statusColor = s => ({
    delivered: 'var(--success)',
    pending: 'var(--warn)',
    cancelled: '#9CA3AF'
  })[s] || 'var(--ink-600)';
  const statusLabel = s => ({
    delivered: 'Đã nhận tiền',
    pending: 'Đang xử lý',
    shipped: 'Đang giao',
    confirmed: 'Chờ giao',
    cancelled: 'Đã huỷ'
  })[s] || s;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 16px',
      fontSize: 18,
      fontWeight: 600
    }
  }, "T\xE0i ch\xEDnh \xB7 Thanh to\xE1n"), notice && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      marginBottom: 12,
      borderRadius: 6,
      fontSize: 12,
      background: notice.ok ? '#ECFDF5' : '#FEF2F2',
      color: notice.ok ? '#059669' : '#DC2626',
      border: `1px solid ${notice.ok ? '#A7F3D0' : '#FCA5A5'}`
    }
  }, notice.msg), loading ? /*#__PURE__*/React.createElement("div", {
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
  }), "\u0110ang t\u1EA3i...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 14,
      marginBottom: 18
    }
  }, [{
    label: 'Có thể rút',
    value: balance ? window.formatVND(balance.available) : '—',
    color: 'var(--success)',
    note: 'Đã định toán'
  }, {
    label: 'Đang chờ',
    value: balance ? window.formatVND(balance.pending) : '—',
    color: 'var(--warn)',
    note: 'Chờ xác nhận giao'
  }, {
    label: 'Tổng doanh thu',
    value: balance ? window.formatVND(balance.total) : '—',
    color: 'var(--primary)',
    note: 'Sau phí 5% platform'
  }].map(c => /*#__PURE__*/React.createElement("div", {
    key: c.label,
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 8
    }
  }, c.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: c.color
    }
  }, c.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-500)',
      marginTop: 4
    }
  }, c.note)))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16,
      marginBottom: 18,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wallet",
    size: 24,
    color: "var(--primary)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "T\xE0i kho\u1EA3n ng\xE2n h\xE0ng"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginTop: 2
    }
  }, balance && balance.bank_account ? /*#__PURE__*/React.createElement("span", null, balance.bank_account.bank, " \xB7 ", /*#__PURE__*/React.createElement("b", {
    style: {
      fontFamily: 'monospace'
    }
  }, balance.bank_account.masked), /*#__PURE__*/React.createElement("span", {
    className: "badge",
    style: {
      marginLeft: 8,
      fontSize: 10,
      background: '#EFF6FF',
      color: '#2563EB'
    }
  }, balance.bank_account.encryption)) : '—'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--ink-400)',
      marginTop: 2
    }
  }, "S\u1ED1 t\xE0i kho\u1EA3n l\u01B0u m\xE3 ho\xE1 AES-256-GCM trong DB \xB7 Ch\u1EC9 hi\u1EC3n th\u1ECB d\u1EA1ng masked")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowWithdraw(true),
    disabled: !balance,
    className: "btn btn-primary",
    style: {
      padding: '8px 16px',
      fontSize: 12
    }
  }, "Y\xEAu c\u1EA7u r\xFAt ti\u1EC1n")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px',
      borderBottom: '1px solid var(--ink-100)',
      fontWeight: 600,
      fontSize: 14
    }
  }, "L\u1ECBch s\u1EED giao d\u1ECBch"), txns.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32,
      textAlign: 'center',
      color: 'var(--ink-500)',
      fontSize: 13
    }
  }, "Ch\u01B0a c\xF3 giao d\u1ECBch. Khi \u0111\u01A1n h\xE0ng \u0111\u01B0\u1EE3c giao, ti\u1EC1n s\u1EBD hi\u1EC7n \u1EDF \u0111\xE2y.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 1fr',
      gap: 10,
      padding: '8px 16px',
      background: 'var(--ink-100)',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--ink-600)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Ng\xE0y"), /*#__PURE__*/React.createElement("span", null, "M\xF4 t\u1EA3"), /*#__PURE__*/React.createElement("span", null, "Doanh thu"), /*#__PURE__*/React.createElement("span", null, "Ph\xED (5%)"), /*#__PURE__*/React.createElement("span", null, "Th\u1EF1c nh\u1EADn"), /*#__PURE__*/React.createElement("span", null, "Tr\u1EA1ng th\xE1i")), txns.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 1fr',
      gap: 10,
      padding: '10px 16px',
      fontSize: 12,
      borderBottom: '1px solid var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--ink-500)'
    }
  }, t.date ? new Date(t.date).toLocaleDateString('vi-VN') : '—'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11
    }
  }, t.desc), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-700)'
    }
  }, window.formatVND(t.amount)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--warn)'
    }
  }, "-", window.formatVND(t.fee)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: t.type === 'income' ? 'var(--success)' : 'var(--ink-600)'
    }
  }, window.formatVND(t.net)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: statusColor(t.status)
    }
  }, statusLabel(t.status))))))), showWithdraw && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 90
    },
    onClick: () => setShowWithdraw(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: 12,
      padding: 28,
      maxWidth: 360,
      width: '90%',
      boxShadow: 'var(--shadow-lg)'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 16,
      marginBottom: 4
    }
  }, "Y\xEAu c\u1EA7u r\xFAt ti\u1EC1n"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 16
    }
  }, "S\u1ED1 d\u01B0 c\xF3 th\u1EC3 r\xFAt: ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--success)'
    }
  }, window.formatVND(balance ? balance.available : 0))), /*#__PURE__*/React.createElement("input", {
    className: "input",
    type: "number",
    placeholder: "S\u1ED1 ti\u1EC1n c\u1EA7n r\xFAt (VN\u0110)",
    value: wAmount,
    onChange: e => setWAmount(e.target.value),
    style: {
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#EFF6FF',
      borderRadius: 6,
      fontSize: 11,
      color: '#2563EB',
      marginBottom: 14
    }
  }, "Chuy\u1EC3n \u0111\u1EBFn: VietcomBank \xB7 ", /*#__PURE__*/React.createElement("b", {
    style: {
      fontFamily: 'monospace'
    }
  }, balance && balance.bank_account ? balance.bank_account.masked : '—'), /*#__PURE__*/React.createElement("br", null), "Th\u1EDDi gian: 1-3 ng\xE0y l\xE0m vi\u1EC7c"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      flex: 1,
      border: '1px solid var(--ink-200)'
    },
    onClick: () => setShowWithdraw(false)
  }, "Hu\u1EF7"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      flex: 2
    },
    onClick: doWithdraw
  }, "X\xE1c nh\u1EADn r\xFAt ti\u1EC1n")))));
};
Object.assign(window, {
  MerchantFinanceSection
});