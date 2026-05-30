// UIT Store — Merchant Settings Section

const MerchantSettingsSection = ({
  merchantId,
  user
}) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [settings, setSettings] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
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
  React.useEffect(() => {
    if (!BASE) {
      setLoading(false);
      return;
    }
    fetch(`${BASE}/api/v1/settings/merchant/shop?merchant_id=${merchantId}`, {
      headers: hdr()
    }).then(r => r.json()).then(d => {
      const s = d && d.data || {};
      setSettings(s);
      setDraft({
        ...s
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [merchantId]);
  const set = (k, v) => setDraft(d => ({
    ...d,
    [k]: v
  }));
  const handleSave = () => {
    setSaving(true);
    fetch(`${BASE}/api/v1/settings/merchant/shop`, {
      method: 'PUT',
      headers: hdr(),
      body: JSON.stringify({
        ...draft,
        merchant_id: merchantId
      })
    }).then(r => r.json()).then(d => {
      if (d && d.data) {
        setSettings(d.data);
        setDraft({
          ...d.data
        });
        showMsg('Lưu thành công');
      } else showMsg('Lỗi lưu cài đặt', false);
    }).catch(() => showMsg('Lỗi kết nối', false)).finally(() => setSaving(false));
  };
  const inp = {
    padding: '8px 10px',
    border: '1px solid var(--ink-200)',
    borderRadius: 6,
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box'
  };
  const fmtVND = n => new Intl.NumberFormat('vi-VN').format(n);
  if (loading) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 60,
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
  }), "\u0110ang t\u1EA3i c\xE0i \u0111\u1EB7t...");
  if (!draft) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 18,
      fontWeight: 600
    }
  }, "C\xE0i \u0111\u1EB7t shop"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    disabled: saving,
    className: "btn btn-primary",
    style: {
      padding: '7px 18px',
      fontSize: 13
    }
  }, saving ? 'Đang lưu…' : 'Lưu thay đổi')), notice && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 12px',
      borderRadius: 6,
      marginBottom: 14,
      fontSize: 13,
      fontWeight: 500,
      background: notice.ok ? '#ECFDF5' : '#FEF2F2',
      color: notice.ok ? '#065F46' : '#991B1B',
      border: `1px solid ${notice.ok ? '#6EE7B7' : '#FECACA'}`
    }
  }, notice.msg), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "store",
    size: 15,
    color: "var(--primary)"
  }), " Th\xF4ng tin shop"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "T\xEAn shop"), /*#__PURE__*/React.createElement("input", {
    style: inp,
    value: draft.shop_name || '',
    onChange: e => set('shop_name', e.target.value),
    placeholder: "T\xEAn shop c\u1EE7a b\u1EA1n"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "M\xF4 t\u1EA3 shop"), /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...inp,
      height: 72,
      resize: 'vertical'
    },
    value: draft.description || '',
    onChange: e => set('description', e.target.value),
    placeholder: "M\xF4 t\u1EA3 ng\u1EAFn v\u1EC1 shop c\u1EE7a b\u1EA1n"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "\u0110\u1ECBa ch\u1EC9 kho"), /*#__PURE__*/React.createElement("input", {
    style: inp,
    value: draft.address || '',
    onChange: e => set('address', e.target.value),
    placeholder: "\u0110\u1ECBa ch\u1EC9 l\u1EA5y h\xE0ng"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "truck",
    size: 15,
    color: "var(--primary)"
  }), " Ch\xEDnh s\xE1ch v\u1EADn chuy\u1EC3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "Th\u1EDDi gian x\u1EED l\xFD \u0111\u01A1n (ng\xE0y)"), /*#__PURE__*/React.createElement("input", {
    style: inp,
    type: "number",
    min: 0,
    max: 7,
    value: draft.processing_days ?? 1,
    onChange: e => set('processing_days', +e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 4
    }
  }, "Ph\xED ship m\u1EB7c \u0111\u1ECBnh (\u20AB)"), /*#__PURE__*/React.createElement("input", {
    style: inp,
    type: "number",
    step: 5000,
    value: draft.shipping_fee_default ?? 25000,
    onChange: e => set('shipping_fee_default', +e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-400)',
      marginTop: 8
    }
  }, "Ph\xED ship hi\u1EC3n th\u1ECB: ", fmtVND(draft.shipping_fee_default ?? 25000), "\u20AB \xB7 X\u1EED l\xFD trong ", draft.processing_days ?? 1, " ng\xE0y l\xE0m vi\u1EC7c")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "refresh-cw",
    size: 15,
    color: "var(--primary)"
  }), " Ch\xEDnh s\xE1ch \u0111\u1ED5i tr\u1EA3"), /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...inp,
      height: 80,
      resize: 'vertical'
    },
    value: draft.return_policy || '',
    onChange: e => set('return_policy', e.target.value),
    placeholder: "M\xF4 t\u1EA3 ch\xEDnh s\xE1ch \u0111\u1ED5i tr\u1EA3 c\u1EE7a shop"
  })), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 15,
    color: "var(--primary)"
  }), " Th\xF4ng b\xE1o email"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, [{
    key: 'notify_new_order',
    label: 'Đơn hàng mới',
    sub: 'Gửi email khi có đơn cần xác nhận'
  }, {
    key: 'notify_cancelled',
    label: 'Đơn bị huỷ',
    sub: 'Gửi email khi khách huỷ đơn'
  }].map(item => /*#__PURE__*/React.createElement("div", {
    key: item.key,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500
    }
  }, item.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-400)'
    }
  }, item.sub)), /*#__PURE__*/React.createElement("button", {
    onClick: () => set(item.key, !draft[item.key]),
    style: {
      width: 40,
      height: 22,
      borderRadius: 11,
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      background: draft[item.key] ? 'var(--primary)' : 'var(--ink-200)',
      transition: 'background 0.2s'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: 'white',
      transition: 'left 0.2s',
      left: draft[item.key] ? 21 : 3
    }
  })))))));
};
Object.assign(window, {
  MerchantSettingsSection
});