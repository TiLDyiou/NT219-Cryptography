// UIT Store — Merchant Security Section (NT219 focal point)

const MerchantSecuritySection = ({
  merchantId,
  user
}) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [keyData, setKeyData] = React.useState(null);
  const [auditLog, setAuditLog] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [rotating, setRotating] = React.useState(false);
  const [newKey, setNewKey] = React.useState(null);
  const [auditFilter, setAuditFilter] = React.useState('all');
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
      setKeyData(null);
      setAuditLog([]);
      setLoading(false);
      return;
    }
    const qp = merchantId ? `?merchant_id=${merchantId}` : '';
    Promise.all([fetch(`${BASE}/api/v1/security/merchant/api-keys${qp}`, {
      headers: hdr()
    }).then(r => r.json()), fetch(`${BASE}/api/v1/security/merchant/audit-log${qp}`, {
      headers: hdr()
    }).then(r => r.json())]).then(([k, a]) => {
      setKeyData(k.data || null);
      setAuditLog(Array.isArray(a.data) ? a.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  React.useEffect(() => {
    load();
  }, [merchantId]);
  const rotateKey = () => {
    if (!window.confirm('Rotate API key? Key cũ sẽ bị vô hiệu ngay lập tức.')) return;
    setRotating(true);
    fetch(`${BASE}/api/v1/security/merchant/api-keys/rotate`, {
      method: 'POST',
      headers: hdr(),
      body: JSON.stringify({
        merchant_id: merchantId
      })
    }).then(r => r.json()).then(d => {
      setNewKey(d.data && d.data.new_key_full);
      setRotating(false);
      load();
    }).catch(() => setRotating(false));
  };
  const auditTypes = ['all', 'login', 'product_update', 'order_status_change', 'api_key_rotate', 'new_order'];
  const filteredLog = auditFilter === 'all' ? auditLog : auditLog.filter(e => e.action === auditFilter);
  const daysUntilExpiry = expStr => {
    if (!expStr) return null;
    const diff = new Date(expStr) - new Date();
    return Math.round(diff / 86400000);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 16px',
      fontSize: 18,
      fontWeight: 600
    }
  }, "B\u1EA3o m\u1EADt shop"), loading ? /*#__PURE__*/React.createElement("div", {
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
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "fingerprint",
    size: 18,
    color: "var(--primary)"
  }), " Tr\u1EA1ng th\xE1i MFA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-500)'
    }
  }, "Ch\u01B0a c\xF3 endpoint backend tr\u1EA3 tr\u1EA1ng th\xE1i MFA cho merchant.")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "key",
    size: 18,
    color: "var(--primary)"
  }), " API Key Management"), newKey && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      marginBottom: 14,
      background: '#FFFBEB',
      border: '1.5px solid #FCD34D',
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      color: '#92400E',
      marginBottom: 6
    }
  }, "Key m\u1EDBi - ch\u1EC9 hi\u1EC3n th\u1ECB m\u1ED9t l\u1EA7n"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      background: 'white',
      padding: '6px 10px',
      borderRadius: 4,
      letterSpacing: '0.05em',
      wordBreak: 'break-all'
    }
  }, newKey), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#92400E',
      marginTop: 6
    }
  }, "Sao ch\xE9p v\xE0 l\u01B0u v\xE0o secret manager ngay. Sau khi \u0111\xF3ng h\u1ED9p n\xE0y key s\u1EBD b\u1ECB che."), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewKey(null),
    style: {
      marginTop: 8,
      padding: '4px 12px',
      fontSize: 11,
      border: '1px solid #FCD34D',
      borderRadius: 4,
      background: 'white',
      color: '#92400E'
    }
  }, "\u0110\xE3 l\u01B0u, \u0111\xF3ng")), keyData && keyData.current ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      marginBottom: 14
    }
  }, [{
    l: 'Key ID',
    v: keyData.current.id
  }, {
    l: 'Version',
    v: `v${keyData.current.version}`
  }, {
    l: 'Tạo lúc',
    v: keyData.current.created_at ? new Date(keyData.current.created_at).toLocaleDateString('vi-VN') : '—'
  }, {
    l: 'Hết hạn',
    v: (() => {
      const d = daysUntilExpiry(keyData.current.expires_at);
      return d != null ? `${d >= 0 ? d : 0} ngày nữa` : '—';
    })()
  }].map(i => /*#__PURE__*/React.createElement("div", {
    key: i.l,
    style: {
      padding: '8px 12px',
      background: 'var(--ink-100)',
      borderRadius: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--ink-500)',
      marginBottom: 2
    }
  }, i.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      fontWeight: 600
    }
  }, i.v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: 'var(--ink-100)',
      borderRadius: 6,
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-500)',
      marginBottom: 2
    }
  }, "API Key hi\u1EC7n t\u1EA1i"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      fontWeight: 600
    }
  }, keyData.current.masked || '—')), (() => {
    const d = daysUntilExpiry(keyData.current.expires_at);
    if (d != null && d < 14) return /*#__PURE__*/React.createElement("span", {
      className: "badge",
      style: {
        fontSize: 10,
        background: '#FEF3C7',
        color: '#D97706'
      }
    }, "S\u1EAFp h\u1EBFt h\u1EA1n");
    return /*#__PURE__*/React.createElement("span", {
      className: "badge badge-success",
      style: {
        fontSize: 10
      }
    }, "Valid");
  })()), /*#__PURE__*/React.createElement("button", {
    onClick: rotateKey,
    disabled: rotating,
    className: "btn btn-primary",
    style: {
      padding: '8px 18px',
      fontSize: 13
    }
  }, rotating ? 'Đang rotate...' : 'Rotate API Key'), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 12,
      fontSize: 11,
      color: 'var(--ink-500)'
    }
  }, "Khuy\u1EBFn ngh\u1ECB rotate m\u1ED7i 90 ng\xE0y \xB7 Auto-rotation l\xFAc h\u1EBFt h\u1EA1n"), keyData.history && keyData.history.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      marginBottom: 8,
      color: 'var(--ink-600)'
    }
  }, "L\u1ECBch s\u1EED rotation"), keyData.history.slice(0, 3).map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 10,
      padding: '6px 10px',
      background: 'var(--ink-100)',
      borderRadius: 4,
      marginBottom: 4,
      fontSize: 11,
      fontFamily: 'JetBrains Mono, monospace',
      color: 'var(--ink-600)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "v", h.version), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, h.created_at ? new Date(h.created_at).toLocaleDateString('vi-VN') : '—'), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#9CA3AF'
    }
  }, "revoked"))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-500)',
      fontSize: 13
    }
  }, "Ch\u01B0a c\xF3 API key. ", /*#__PURE__*/React.createElement("button", {
    onClick: load,
    style: {
      color: 'var(--primary)'
    }
  }, "T\u1EA3i l\u1EA1i"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 18,
    color: "var(--primary)"
  }), " mTLS Client Certificate"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-500)'
    }
  }, "Ch\u01B0a c\xF3 endpoint backend tr\u1EA3 ch\u1EE9ng ch\u1EC9 mTLS cho merchant.")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px',
      borderBottom: '1px solid var(--ink-100)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 14,
    color: "var(--primary)"
  }), " Audit Log \u2014 Append-only"), /*#__PURE__*/React.createElement("select", {
    value: auditFilter,
    onChange: e => setAuditFilter(e.target.value),
    style: {
      padding: '4px 8px',
      fontSize: 11,
      border: '1px solid var(--ink-200)',
      borderRadius: 4
    }
  }, auditTypes.map(t => /*#__PURE__*/React.createElement("option", {
    key: t,
    value: t
  }, t))), /*#__PURE__*/React.createElement("button", {
    onClick: load,
    style: {
      padding: '4px 10px',
      fontSize: 11,
      border: '1px solid var(--ink-200)',
      borderRadius: 4,
      background: 'white'
    }
  }, "\u21BB")), filteredLog.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      textAlign: 'center',
      color: 'var(--ink-500)',
      fontSize: 12
    }
  }, "Kh\xF4ng c\xF3 log") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '160px 1.2fr 2fr 1fr',
      gap: 10,
      padding: '8px 16px',
      background: 'var(--ink-100)',
      fontSize: 10,
      fontWeight: 600,
      color: 'var(--ink-600)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Th\u1EDDi gian"), /*#__PURE__*/React.createElement("span", null, "Action"), /*#__PURE__*/React.createElement("span", null, "Resource / Chi ti\u1EBFt"), /*#__PURE__*/React.createElement("span", null, "Signature")), filteredLog.slice(0, 30).map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    style: {
      display: 'grid',
      gridTemplateColumns: '160px 1.2fr 2fr 1fr',
      gap: 10,
      padding: '8px 16px',
      fontSize: 11,
      borderBottom: '1px solid var(--ink-100)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10
    }
  }, e.timestamp ? new Date(e.timestamp).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) : '—'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--ink-400)',
      marginTop: 1
    }
  }, e.ip)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      color: 'var(--primary)'
    }
  }, e.action), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--ink-600)',
      wordBreak: 'break-word'
    }
  }, e.resource), /*#__PURE__*/React.createElement("div", null, e.sig_ok ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontFamily: 'JetBrains Mono, monospace',
      color: 'var(--success)',
      display: 'flex',
      alignItems: 'center',
      gap: 3
    }
  }, e.signature ? e.signature.slice(0, 24) + '...' : 'ok') : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: '#DC2626'
    }
  }, "INVALID")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 16px',
      fontSize: 10,
      color: 'var(--ink-400)',
      fontFamily: 'JetBrains Mono, monospace',
      borderTop: '1px solid var(--ink-100)'
    }
  }, "Audit log \u0111\u01B0\u1EE3c k\xFD HMAC-SHA256 \xB7 immutable \xB7 d\xF9ng \u0111\u1EC3 detect tampering")))));
};
Object.assign(window, {
  MerchantSecuritySection
});