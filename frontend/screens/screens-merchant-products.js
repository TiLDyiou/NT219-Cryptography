// UIT Store — Merchant Products Section

const MerchantProductsSection = ({
  merchantId,
  user
}) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [showAdd, setShowAdd] = React.useState(false);
  const [editId, setEditId] = React.useState(null); // inline edit
  const [editVals, setEditVals] = React.useState({});
  const [notice, setNotice] = React.useState(null);
  const [form, setForm] = React.useState({
    name: '',
    price: '',
    sku: '',
    stock: '',
    category: 'phone',
    description: ''
  });
  const [saving, setSaving] = React.useState(false);
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
      setProducts([]);
      setLoading(false);
      return;
    }
    fetch(`${BASE}/api/v1/catalog/merchant/products?merchant_id=${merchantId || ''}`, {
      headers: hdr()
    }).then(r => {
      if (!r.ok) throw new Error('Không tải được danh sách sản phẩm.');
      return r.json();
    }).then(d => {
      const rows = Array.isArray(d.data) ? d.data : [];
      setProducts(rows.map(p => ({
        ...p,
        category: p.metadata_json && p.metadata_json.category || p.category || 'other',
        stock: p.metadata_json && typeof p.metadata_json.stock === 'number' ? p.metadata_json.stock : p.stock,
        description: p.metadata_json && p.metadata_json.description || p.description || ''
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  React.useEffect(() => {
    load();
  }, [merchantId]);
  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()));
  const startEdit = p => {
    setEditId(p.id);
    setEditVals({
      price: p.base_price
    });
  };
  const saveEdit = product => {
    setSaving(true);
    fetch(`${BASE}/api/v1/catalog/merchant/products/${product.id}`, {
      method: 'PUT',
      headers: hdr(),
      body: JSON.stringify({
        base_price: Number(editVals.price),
        version: product.version
      })
    }).then(r => {
      if (!r.ok) throw new Error('Không cập nhật được sản phẩm.');
      load();
      setEditId(null);
      showNotice('Đã cập nhật sản phẩm');
      setSaving(false);
    }).catch(err => {
      showNotice(err.message || 'Không cập nhật được sản phẩm.', false);
      setSaving(false);
    });
  };
  const toggleActive = p => {
    fetch(`${BASE}/api/v1/catalog/merchant/products/${p.id}`, {
      method: 'PUT',
      headers: hdr(),
      body: JSON.stringify({
        is_active: !p.is_active,
        version: p.version
      })
    }).then(r => {
      if (!r.ok) throw new Error(`Không ${!p.is_active ? 'hiện' : 'ẩn'} được sản phẩm.`);
      load();
      showNotice(`${p.name} đã ${!p.is_active ? 'hiện' : 'ẩn'}`);
    }).catch(err => showNotice(err.message || 'Không cập nhật được sản phẩm.', false));
  };
  const deleteProduct = p => {
    if (!window.confirm(`Xoá sản phẩm "${p.name}"?`)) return;
    fetch(`${BASE}/api/v1/catalog/merchant/products/${p.id}`, {
      method: 'DELETE',
      headers: hdr()
    }).then(r => {
      if (!r.ok) throw new Error('Không xoá được sản phẩm.');
      load();
      showNotice('Đã xoá sản phẩm');
    }).catch(err => showNotice(err.message || 'Không xoá được sản phẩm.', false));
  };
  const addProduct = () => {
    if (!form.name.trim() || !form.sku.trim() || !form.price) return showNotice('Vui lòng điền tên, SKU và giá', false);
    setSaving(true);
    fetch(`${BASE}/api/v1/catalog/merchant/products`, {
      method: 'POST',
      headers: hdr(),
      body: JSON.stringify({
        sku: form.sku.trim(),
        name: form.name.trim(),
        status: 'active',
        base_price: Number(form.price),
        metadata_json: {
          category: form.category,
          stock: Number(form.stock || 0),
          description: form.description
        },
        merchant_id: merchantId
      })
    }).then(r => {
      if (!r.ok) {
        return r.json().catch(() => null).then(body => {
          const msg = body && body.detail ? body.detail : 'Không thêm được sản phẩm.';
          throw new Error(msg);
        });
      }
      return r.json();
    }).then(() => {
      if (window.UitAPI && window.UitAPI.catalog && window.UitAPI.mapApiProduct) {
        window.UitAPI.catalog.listProducts().then(res => {
          const rows = res && Array.isArray(res.data) ? res.data : [];
          window.PRODUCTS = rows.map(p => window.UitAPI.mapApiProduct(p));
        }).catch(() => {});
      }
      load();
      setShowAdd(false);
      setForm({
        name: '',
        price: '',
        sku: '',
        stock: '',
        category: 'phone',
        description: ''
      });
      showNotice('Đã thêm sản phẩm mới');
      setSaving(false);
    }).catch(err => {
      showNotice(err.message || 'Không thêm được sản phẩm.', false);
      setSaving(false);
    });
  };
  const catName = id => {
    const cats = window.CATEGORIES || [];
    const c = cats.find(c => c.id === id);
    return c ? c.name : id;
  };
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
  }, "Qu\u1EA3n l\xFD s\u1EA3n ph\u1EA9m"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "input",
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "T\xECm t\xEAn / SKU...",
    style: {
      width: 200,
      padding: '6px 10px',
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAdd(true),
    className: "btn btn-primary",
    style: {
      padding: '6px 14px',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), " Th\xEAm s\u1EA3n ph\u1EA9m"))), notice && /*#__PURE__*/React.createElement("div", {
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
  }), "\u0110ang t\u1EA3i...") : /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '50px 2.5fr 1fr 1fr 1fr 0.8fr 1fr 1fr',
      gap: 8,
      padding: '10px 16px',
      background: 'var(--ink-100)',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--ink-600)'
    }
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null, "S\u1EA3n ph\u1EA9m"), /*#__PURE__*/React.createElement("span", null, "SKU"), /*#__PURE__*/React.createElement("span", null, "Danh m\u1EE5c"), /*#__PURE__*/React.createElement("span", null, "Gi\xE1 b\xE1n"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center'
    }
  }, "T\u1ED3n"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center'
    }
  }, "Tr\u1EA1ng th\xE1i"), /*#__PURE__*/React.createElement("span", null)), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32,
      textAlign: 'center',
      color: 'var(--ink-500)',
      fontSize: 13
    }
  }, search ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'), filtered.map(p => {
    const isEditing = editId === p.id;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: 'grid',
        gridTemplateColumns: '50px 2.5fr 1fr 1fr 1fr 0.8fr 1fr 1fr',
        gap: 8,
        padding: '12px 16px',
        fontSize: 12,
        borderBottom: '1px solid var(--ink-100)',
        alignItems: 'center',
        background: !p.is_active ? '#FAFAFA' : 'white'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "ph-img",
      style: {
        width: 38,
        height: 38,
        borderRadius: 4,
        fontSize: 8
      }
    }, p.brand), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        opacity: p.is_active ? 1 : 0.5,
        display: '-webkit-box',
        WebkitLineClamp: 1,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-500)',
        marginTop: 1
      }
    }, p.brand)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        color: 'var(--ink-500)'
      }
    }, p.sku), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, catName(p.category)), isEditing ? /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: editVals.price,
      onChange: e => setEditVals({
        ...editVals,
        price: e.target.value
      }),
      style: {
        width: '100%',
        padding: '4px 6px',
        fontSize: 12,
        border: '1.5px solid var(--primary)',
        borderRadius: 4,
        outline: 'none'
      }
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: 'var(--price)',
        cursor: 'pointer'
      },
      onClick: () => startEdit(p),
      title: "Click \u0111\u1EC3 s\u1EEDa gi\xE1"
    }, window.formatVND(p.base_price)), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'center',
        color: p.stock < 10 ? 'var(--warn)' : 'var(--ink-700)'
      }
    }, typeof p.stock === 'number' ? p.stock : '—'), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, p.is_active ? /*#__PURE__*/React.createElement("span", {
      className: "badge badge-success",
      style: {
        fontSize: 10
      }
    }, "Active") : /*#__PURE__*/React.createElement("span", {
      className: "badge",
      style: {
        fontSize: 10,
        background: 'var(--ink-100)',
        color: 'var(--ink-500)'
      }
    }, "\u1EA8n")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        justifyContent: 'flex-end'
      }
    }, isEditing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => saveEdit(p),
      disabled: saving,
      className: "btn btn-primary",
      style: {
        padding: '4px 10px',
        fontSize: 11
      }
    }, "L\u01B0u"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditId(null),
      style: {
        padding: '4px 10px',
        fontSize: 11,
        border: '1px solid var(--ink-200)',
        borderRadius: 4,
        background: 'white'
      }
    }, "Hu\u1EF7")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => startEdit(p),
      title: "S\u1EEDa gi\xE1",
      style: {
        padding: '4px 8px',
        fontSize: 11,
        border: '1px solid var(--ink-200)',
        borderRadius: 4,
        background: 'white'
      }
    }, "S\u1EEDa"), /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleActive(p),
      title: p.is_active ? 'Ẩn sản phẩm' : 'Hiện sản phẩm',
      style: {
        padding: '4px 8px',
        fontSize: 11,
        border: '1px solid var(--ink-200)',
        borderRadius: 4,
        background: 'white'
      }
    }, p.is_active ? 'Ẩn' : 'Hiện'), /*#__PURE__*/React.createElement("button", {
      onClick: () => deleteProduct(p),
      title: "Xo\xE1",
      style: {
        padding: '4px 8px',
        fontSize: 11,
        border: '1px solid #FCA5A5',
        borderRadius: 4,
        background: 'white',
        color: '#DC2626'
      }
    }, "Xo\xE1"))));
  })), showAdd && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 90
    },
    onClick: () => setShowAdd(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: 12,
      padding: 28,
      maxWidth: 440,
      width: '90%',
      boxShadow: 'var(--shadow-lg)'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 16,
      marginBottom: 16
    }
  }, "Th\xEAm s\u1EA3n ph\u1EA9m m\u1EDBi"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "T\xEAn s\u1EA3n ph\u1EA9m *",
    value: form.name,
    onChange: e => setForm({
      ...form,
      name: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "Gi\xE1 b\xE1n (VN\u0110) *",
    type: "number",
    value: form.price,
    onChange: e => setForm({
      ...form,
      price: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "T\u1ED3n kho",
    type: "number",
    value: form.stock,
    onChange: e => setForm({
      ...form,
      stock: e.target.value
    })
  })), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "SKU *",
    value: form.sku,
    onChange: e => setForm({
      ...form,
      sku: e.target.value
    })
  }), /*#__PURE__*/React.createElement("select", {
    className: "input",
    value: form.category,
    onChange: e => setForm({
      ...form,
      category: e.target.value
    }),
    style: {
      padding: '8px 10px',
      fontSize: 13,
      borderRadius: 6,
      border: '1px solid var(--ink-200)'
    }
  }, (window.CATEGORIES || []).map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name))), /*#__PURE__*/React.createElement("textarea", {
    className: "input",
    placeholder: "M\xF4 t\u1EA3 (tu\u1EF3 ch\u1ECDn)",
    rows: 2,
    value: form.description,
    onChange: e => setForm({
      ...form,
      description: e.target.value
    }),
    style: {
      resize: 'vertical',
      fontFamily: 'inherit',
      fontSize: 13
    }
  })), /*#__PURE__*/React.createElement("div", {
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
    onClick: () => setShowAdd(false)
  }, "Hu\u1EF7"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      flex: 2
    },
    disabled: saving,
    onClick: addProduct
  }, saving ? 'Đang lưu...' : 'Lưu sản phẩm')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 10,
      fontFamily: 'JetBrains Mono, monospace',
      color: 'var(--ink-400)'
    }
  }, "POST /api/v1/catalog/merchant/products \xB7 HMAC-SHA256 signed"))));
};
Object.assign(window, {
  MerchantProductsSection
});
