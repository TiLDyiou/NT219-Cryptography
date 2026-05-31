// UIT Store — Merchant Products Section

const MerchantProductsSection = ({ merchantId, user }) => {
  const BASE = window.UitAPI && window.UitAPI.backendUrl;
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [search, setSearch]     = React.useState('');
  const [showAdd, setShowAdd]   = React.useState(false);
  const [editId, setEditId]     = React.useState(null);   // inline edit
  const [editVals, setEditVals] = React.useState({});
  const [notice, setNotice]     = React.useState(null);
  const [form, setForm]         = React.useState({ name:'', price:'', sku:'', stock:'', category:'phone', description:'', imageUrl:'' });
  const [saving, setSaving]     = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const resolveImg = (url) => (window.UitAPI && window.UitAPI.resolveMediaUrl)
    ? window.UitAPI.resolveMediaUrl(url)
    : url;

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
      return [{ url: trimmed, alt: alt || '' }];
    }
    if (trimmed.startsWith('data:')) {
      return 'embedded';
    }
    return 'invalid';
  };

  const showNotice = (msg, ok) => { setNotice({ msg, ok: ok !== false }); setTimeout(() => setNotice(null), 3000); };

  const load = () => {
    setLoading(true);
    if (!window.UitAPI || !window.UitAPI.merchantProducts || !user) {
      setProducts([]); setLoading(false); return;
    }
    window.UitAPI.merchantProducts.list()
      .then(d => {
        const rows = Array.isArray(d.data) ? d.data : [];
        setProducts(rows.map(p => ({
          ...p,
          category: p.metadata_json && p.metadata_json.category || p.category || 'other',
          stock: p.metadata_json && typeof p.metadata_json.stock === 'number' ? p.metadata_json.stock : p.stock,
          description: p.metadata_json && p.metadata_json.description || p.description || '',
        })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => { load(); }, [merchantId]);

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

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
    window.UitAPI.merchantProducts.uploadImage(file)
      .then(res => {
        const url = res && res.data && res.data.url;
        if (!url) throw new Error('Upload không trả URL ảnh');
        onUrl(url);
        showNotice('Đã tải ảnh lên');
        setUploading(false);
      })
      .catch(err => {
        showNotice(parseErr(err, 'Không tải được ảnh lên'), false);
        setUploading(false);
      });
    e.target.value = '';
  };

  const startEdit = (p) => {
    const imgUrl = p.images && p.images.length > 0 ? (p.images[0].url || '') : '';
    setEditId(p.id);
    setEditVals({ price: p.base_price, imageUrl: imgUrl });
  };

  const saveEdit = (product) => {
    setSaving(true);
    const body = { base_price: Number(editVals.price), version: product.version };
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
    window.UitAPI.merchantProducts.update(product.id, body)
      .then(() => { load(); setEditId(null); showNotice('Đã cập nhật sản phẩm'); setSaving(false); })
      .catch(err => { showNotice(parseErr(err, 'Không cập nhật được sản phẩm.'), false); setSaving(false); });
  };

  const toggleActive = (p) => {
    const isPublic = p.is_active && p.status === 'active';
    window.UitAPI.merchantProducts.update(p.id, {
      is_active: !isPublic,
      status: isPublic ? 'inactive' : 'active',
      version: p.version,
    })
      .then(() => { load(); showNotice(`${p.name} đã ${isPublic ? 'ẩn' : 'công khai'}`); })
      .catch(err => showNotice(parseErr(err, 'Không cập nhật được sản phẩm.'), false));
  };

  const deleteProduct = (p) => {
    if (!window.confirm(`Xoá sản phẩm "${p.name}"?`)) return;
    window.UitAPI.merchantProducts.delete(p.id)
      .then(() => { load(); showNotice('Đã xoá sản phẩm'); })
      .catch(err => showNotice(parseErr(err, 'Không xoá được sản phẩm.'), false));
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
        description: form.description,
      },
    })
    .then(() => {
      if (window.UitAPI && window.UitAPI.catalog && window.UitAPI.mapApiProduct) {
        window.UitAPI.catalog.listProducts().then(res => {
          const rows = res && Array.isArray(res.data) ? res.data : [];
          window.PRODUCTS = rows.map(p => window.UitAPI.mapApiProduct(p));
        }).catch(() => {});
      }
      load(); setShowAdd(false);
      setForm({ name:'', price:'', sku:'', stock:'', category:'phone', description:'', imageUrl:'' });
      showNotice('Đã thêm sản phẩm mới');
      setSaving(false);
    })
    .catch(err => { showNotice(parseErr(err, 'Không thêm được sản phẩm.'), false); setSaving(false); });
  };

  const catName = id => {
    const cats = window.CATEGORIES || [];
    const c = cats.find(c => c.id === id);
    return c ? c.name : id;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Quản lý sản phẩm</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm tên / SKU..." style={{ width: 200, padding: '6px 10px', fontSize: 12 }} />
          <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
            <Icon name="plus" size={13}/> Thêm sản phẩm
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 6, fontSize: 12, background: notice.ok ? '#ECFDF5' : '#FEF2F2', color: notice.ok ? '#059669' : '#DC2626', border: `1px solid ${notice.ok ? '#A7F3D0' : '#FCA5A5'}` }}>
          {notice.msg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-400)' }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 10px', borderWidth: 3 }} />Đang tải...
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '50px 2.5fr 1fr 1fr 1fr 0.8fr 1fr 1fr',
            gap: 8, padding: '10px 16px', background: 'var(--ink-100)', fontSize: 11, fontWeight: 600, color: 'var(--ink-600)',
          }}>
            <span></span><span>Sản phẩm</span><span>SKU</span><span>Danh mục</span>
            <span>Giá bán</span><span style={{ textAlign: 'center' }}>Tồn</span>
            <span style={{ textAlign: 'center' }}>Trạng thái</span><span></span>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)', fontSize: 13 }}>
              {search ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
            </div>
          )}

          {filtered.map(p => {
            const isEditing = editId === p.id;
            return (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '50px 2.5fr 1fr 1fr 1fr 0.8fr 1fr 1fr',
                gap: 8, padding: '12px 16px', fontSize: 12,
                borderBottom: '1px solid var(--ink-100)', alignItems: 'center',
                background: !(p.is_active && p.status === 'active') ? '#FAFAFA' : 'white',
              }}>
                {p.images && p.images[0] && p.images[0].url
                  ? <img src={resolveImg(p.images[0].url)} alt={p.name} style={{ width: 38, height: 38, borderRadius: 4, objectFit: 'cover' }} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                  : null}
                <div className="ph-img" style={{ width: 38, height: 38, borderRadius: 4, fontSize: 8, display: p.images && p.images[0] && p.images[0].url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.brand}</div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, opacity: p.is_active && p.status === 'active' ? 1 : 0.5, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 1 }}>{p.brand}</div>
                </div>

                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-500)' }}>{p.sku}</span>

                <span style={{ fontSize: 11, color: 'var(--ink-600)' }}>{catName(p.category)}</span>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input type="number" value={editVals.price}
                      onChange={e => setEditVals({ ...editVals, price: e.target.value })}
                      style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1.5px solid var(--primary)', borderRadius: 4, outline: 'none' }} />
                    <input type="text" value={editVals.imageUrl || ''} placeholder="URL ảnh"
                      onChange={e => setEditVals({ ...editVals, imageUrl: e.target.value })}
                      style={{ width: '100%', padding: '4px 6px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4, outline: 'none' }} />
                    <label style={{ fontSize: 10, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="camera" size={11} /> Tải ảnh lên
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => pickImage(e, url => setEditVals({ ...editVals, imageUrl: url }))} />
                    </label>
                  </div>
                ) : (
                  <span style={{ fontWeight: 600, color: 'var(--price)', cursor: 'pointer' }} onClick={() => startEdit(p)} title="Click để sửa giá">
                    {window.formatVND(p.base_price)}
                  </span>
                )}

                <span style={{ textAlign: 'center', color: p.stock < 10 ? 'var(--warn)' : 'var(--ink-700)' }}>
                  {typeof p.stock === 'number' ? p.stock : '—'}
                </span>

                <div style={{ textAlign: 'center' }}>
                  {p.is_active && p.status === 'active'
                    ? <span className="badge badge-success" style={{ fontSize: 10 }}>Active</span>
                    : <span className="badge" style={{ fontSize: 10, background: 'var(--ink-100)', color: 'var(--ink-500)' }}>{p.status === 'draft' ? 'Nháp' : 'Ẩn'}</span>
                  }
                </div>

                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {isEditing ? (<>
                    <button onClick={() => saveEdit(p)} disabled={saving}
                      className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>Lưu</button>
                    <button onClick={() => setEditId(null)}
                      style={{ padding: '4px 10px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4, background: 'white' }}>Huỷ</button>
                  </>) : (<>
                    <button onClick={() => startEdit(p)} title="Sửa giá"
                      style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4, background: 'white' }}>Sửa</button>
                    <button onClick={() => toggleActive(p)} title={p.is_active && p.status === 'active' ? 'Ẩn sản phẩm' : 'Công khai sản phẩm'}
                      style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4, background: 'white' }}>
                      {p.is_active && p.status === 'active' ? 'Ẩn' : 'Công khai'}
                    </button>
                    <button onClick={() => deleteProduct(p)} title="Xoá"
                      style={{ padding: '4px 8px', fontSize: 11, border: '1px solid #FCA5A5', borderRadius: 4, background: 'white', color: '#DC2626' }}>Xoá</button>
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add product modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 440, width: '90%', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Thêm sản phẩm mới</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <input className="input" placeholder="Tên sản phẩm *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input" placeholder="Giá bán (VNĐ) *" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                <input className="input" placeholder="Tồn kho" type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
              </div>
              <input className="input" placeholder="SKU *" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
              <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                style={{ padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--ink-200)' }}>
                {(window.CATEGORIES || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <textarea className="input" placeholder="Mô tả (tuỳ chọn)" rows={2} value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
              <div style={{ border: '1px solid var(--ink-200)', borderRadius: 6, padding: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6 }}>Ảnh sản phẩm</div>
                <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 8 }}>
                  Tải ảnh lên server trước, hoặc dán URL https://...
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {form.imageUrl
                    ? <img src={resolveImg(form.imageUrl)} alt="preview" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--ink-200)' }} />
                    : <div className="ph-img" style={{ width: 56, height: 56, borderRadius: 6, flexShrink: 0 }} />}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--primary)', borderRadius: 6, cursor: uploading ? 'wait' : 'pointer', fontSize: 12, color: 'var(--primary)', width: 'fit-content', opacity: uploading ? 0.6 : 1 }}>
                      <Icon name="camera" size={13} /> {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} disabled={uploading}
                        onChange={e => pickImage(e, url => setForm({...form, imageUrl: url}))} />
                    </label>
                    <input className="input" placeholder="Hoặc dán URL ảnh..." value={form.imageUrl}
                      onChange={e => setForm({...form, imageUrl: e.target.value})}
                      style={{ padding: '5px 8px', fontSize: 11 }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--ink-200)' }} onClick={() => setShowAdd(false)}>Huỷ</button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={saving} onClick={addProduct}>
                {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-400)' }}>
              POST /api/v1/catalog/merchant/products · HMAC-SHA256 signed
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { MerchantProductsSection });
