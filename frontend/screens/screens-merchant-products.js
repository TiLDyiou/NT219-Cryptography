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
    description: '',
    imageUrl: ''
  });
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const resolveImg = url => window.UitAPI && window.UitAPI.resolveMediaUrl ? window.UitAPI.resolveMediaUrl(url) : url;
  const parseErr = (err, fallback) => {
    if (!err) return fallback;
    if (err.message && err.message !== 'HTTP ' + (err.status || '')) return err.message;
    if (err.body) {
      const fromApi = window.UitAPI && window.UitAPI.parseApiError && window.UitAPI.parseApiError(err.body, err.status);
      if (fromApi) return fromApi;
    }
    return fallback;
  };
  const buildImages = (imageUrl, alt) => {
    if (!imageUrl) return [];
    const trimmed = imageUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/api/')) {
      return [{
        url: trimmed,
        alt: alt || ''
      }];
    }
    if (trimmed.startsWith('data:')) {
      return 'embedded';
    }
    return 'invalid';
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
    if (!window.UitAPI || !window.UitAPI.merchantProducts || !user) {
      setProducts([]);
      setLoading(false);
      return;
    }
    window.UitAPI.merchantProducts.list().then(d => {
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
  const pickImage = (e, onUrl) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotice('File phải là ảnh (JPEG, PNG, ...)', false);
      return;
    }
    if (!window.UitAPI || !window.UitAPI.merchantProducts || !window.UitAPI.merchantProducts.uploadImage) {
      showNotice('API upload chưa sẵn sàng', false);
      return;
    }
    setUploading(true);
    window.UitAPI.merchantProducts.uploadImage(file).then(res => {
      const url = res && res.data && res.data.url;
      if (!url) throw new Error('Upload không trả URL ảnh');
      onUrl(url);
      showNotice('Đã tải ảnh lên');
      setUploading(false);
    }).catch(err => {
      showNotice(parseErr(err, 'Không tải được ảnh lên'), false);
      setUploading(false);
    });
    e.target.value = '';
  };
  const startEdit = p => {
    const imgUrl = p.images && p.images.length > 0 ? p.images[0].url || '' : '';
    setEditId(p.id);
    setEditVals({
      price: p.base_price,
      imageUrl: imgUrl
    });
  };
  const saveEdit = product => {
    setSaving(true);
    const body = {
      base_price: Number(editVals.price),
      version: product.version
    };
    if (editVals.imageUrl !== undefined) {
      const imgs = buildImages(editVals.imageUrl, product.name);
      if (imgs === 'invalid') {
        showNotice('URL ảnh không hợp lệ. Dùng https://... hoặc nút Tải ảnh lên.', false);
        setSaving(false);
        return;
      }
      if (imgs === 'embedded') {
        showNotice('Ảnh chưa upload xong. Dùng nút Tải ảnh lên — không gửi base64 trong JSON.', false);
        setSaving(false);
        return;
      }
      body.images = imgs;
    }
    window.UitAPI.merchantProducts.update(product.id, body).then(() => {
      load();
      setEditId(null);
      showNotice('Đã cập nhật sản phẩm');
      setSaving(false);
    }).catch(err => {
      showNotice(parseErr(err, 'Không cập nhật được sản phẩm.'), false);
      setSaving(false);
    });
  };
  const toggleActive = p => {
    const isPublic = p.is_active && p.status === 'active';
    window.UitAPI.merchantProducts.update(p.id, {
      is_active: !isPublic,
      status: isPublic ? 'inactive' : 'active',
      version: p.version
    }).then(() => {
      load();
      showNotice(`${p.name} đã ${isPublic ? 'ẩn' : 'công khai'}`);
    }).catch(err => showNotice(parseErr(err, 'Không cập nhật được sản phẩm.'), false));
  };
  const deleteProduct = p => {
    if (!window.confirm(`Xoá sản phẩm "${p.name}"?`)) return;
    window.UitAPI.merchantProducts.delete(p.id).then(() => {
      load();
      showNotice('Đã xoá sản phẩm');
    }).catch(err => showNotice(parseErr(err, 'Không xoá được sản phẩm.'), false));
  };
  const addProduct = () => {
    if (!form.name.trim() || !form.sku.trim() || !form.price) return showNotice('Vui lòng điền tên, SKU và giá', false);
    const images = buildImages(form.imageUrl, form.name.trim());
    if (images === 'invalid') {
      return showNotice('URL ảnh không hợp lệ. Dùng https://... hoặc nút Tải ảnh lên.', false);
    }
    if (images === 'embedded') {
      return showNotice('Ảnh chưa upload. Bấm Tải ảnh lên trước khi lưu sản phẩm.', false);
    }
    setSaving(true);
    window.UitAPI.merchantProducts.create({
      sku: form.sku.trim(),
      name: form.name.trim(),
      status: 'active',
      base_price: Number(form.price),
      images,
      metadata_json: {
        category: form.category,
        stock: Number(form.stock || 0),
        description: form.description
      }
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
        description: '',
        imageUrl: ''
      });
      showNotice('Đã thêm sản phẩm mới');
      setSaving(false);
    }).catch(err => {
      showNotice(parseErr(err, 'Không thêm được sản phẩm.'), false);
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
        background: !(p.is_active && p.status === 'active') ? '#FAFAFA' : 'white'
      }
    }, p.images && p.images[0] && p.images[0].url ? /*#__PURE__*/React.createElement("img", {
      src: resolveImg(p.images[0].url),
      alt: p.name,
      style: {
        width: 38,
        height: 38,
        borderRadius: 4,
        objectFit: 'cover'
      },
      onError: e => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }
    }) : null, /*#__PURE__*/React.createElement("div", {
      className: "ph-img",
      style: {
        width: 38,
        height: 38,
        borderRadius: 4,
        fontSize: 8,
        display: p.images && p.images[0] && p.images[0].url ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, p.brand), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        opacity: p.is_active && p.status === 'active' ? 1 : 0.5,
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
    }, catName(p.category)), isEditing ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("input", {
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
    }), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: editVals.imageUrl || '',
      placeholder: "URL \u1EA3nh",
      onChange: e => setEditVals({
        ...editVals,
        imageUrl: e.target.value
      }),
      style: {
        width: '100%',
        padding: '4px 6px',
        fontSize: 11,
        border: '1px solid var(--ink-200)',
        borderRadius: 4,
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: 10,
        color: 'var(--primary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "camera",
      size: 11
    }), " T\u1EA3i \u1EA3nh l\xEAn", /*#__PURE__*/React.createElement("input", {
      type: "file",
      accept: "image/*",
      style: {
        display: 'none'
      },
      onChange: e => pickImage(e, url => setEditVals({
        ...editVals,
        imageUrl: url
      }))
    }))) : /*#__PURE__*/React.createElement("span", {
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
    }, p.is_active && p.status === 'active' ? /*#__PURE__*/React.createElement("span", {
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
    }, p.status === 'draft' ? 'Nháp' : 'Ẩn')), /*#__PURE__*/React.createElement("div", {
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
      title: p.is_active && p.status === 'active' ? 'Ẩn sản phẩm' : 'Công khai sản phẩm',
      style: {
        padding: '4px 8px',
        fontSize: 11,
        border: '1px solid var(--ink-200)',
        borderRadius: 4,
        background: 'white'
      }
    }, p.is_active && p.status === 'active' ? 'Ẩn' : 'Công khai'), /*#__PURE__*/React.createElement("button", {
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
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--ink-200)',
      borderRadius: 6,
      padding: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-600)',
      marginBottom: 6
    }
  }, "\u1EA2nh s\u1EA3n ph\u1EA9m"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-500)',
      marginBottom: 8
    }
  }, "T\u1EA3i \u1EA3nh l\xEAn server tr\u01B0\u1EDBc, ho\u1EB7c d\xE1n URL https://..."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, form.imageUrl ? /*#__PURE__*/React.createElement("img", {
    src: resolveImg(form.imageUrl),
    alt: "preview",
    style: {
      width: 56,
      height: 56,
      objectFit: 'cover',
      borderRadius: 6,
      border: '1px solid var(--ink-200)'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "ph-img",
    style: {
      width: 56,
      height: 56,
      borderRadius: 6,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      border: '1px solid var(--primary)',
      borderRadius: 6,
      cursor: uploading ? 'wait' : 'pointer',
      fontSize: 12,
      color: 'var(--primary)',
      width: 'fit-content',
      opacity: uploading ? 0.6 : 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "camera",
    size: 13
  }), " ", uploading ? 'Đang tải...' : 'Tải ảnh lên', /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/jpeg,image/png,image/webp,image/gif",
    style: {
      display: 'none'
    },
    disabled: uploading,
    onChange: e => pickImage(e, url => setForm({
      ...form,
      imageUrl: url
    }))
  })), /*#__PURE__*/React.createElement("input", {
    className: "input",
    placeholder: "Ho\u1EB7c d\xE1n URL \u1EA3nh...",
    value: form.imageUrl,
    onChange: e => setForm({
      ...form,
      imageUrl: e.target.value
    }),
    style: {
      padding: '5px 8px',
      fontSize: 11
    }
  }))))), /*#__PURE__*/React.createElement("div", {
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
