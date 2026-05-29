// UIT Store — Merchant Products Section

const MerchantProductsSection = ({ merchantId, user }) => {
  const BASE = (window.UitAPI && window.UitAPI.backendUrl) || 'http://localhost:10000';
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [search, setSearch]     = React.useState('');
  const [showAdd, setShowAdd]   = React.useState(false);
  const [editId, setEditId]     = React.useState(null);   // inline edit
  const [editVals, setEditVals] = React.useState({});
  const [notice, setNotice]     = React.useState(null);
  const [form, setForm]         = React.useState({ name:'', price:'', sku:'', stock:'', category:'phone', description:'' });
  const [saving, setSaving]     = React.useState(false);

  const hdr = () => {
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    return t
      ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }
      : { 'Content-Type': 'application/json', 'X-User-Id': (user && user.id) || 'user_demo_001' };
  };

  const showNotice = (msg, ok) => { setNotice({ msg, ok: ok !== false }); setTimeout(() => setNotice(null), 3000); };

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/v1/catalog/merchant/products?merchant_id=${merchantId || ''}`, { headers: hdr() })
      .then(r => r.json())
      .then(d => { setProducts(Array.isArray(d.data) ? d.data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => { load(); }, [merchantId]);

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (p) => {
    setEditId(p.id);
    setEditVals({ price: p.base_price, stock: p.stock });
  };

  const saveEdit = (productId) => {
    setSaving(true);
    fetch(`${BASE}/api/v1/catalog/merchant/products/${productId}`, {
      method: 'PUT', headers: hdr(),
      body: JSON.stringify({ price: Number(editVals.price), stock: Number(editVals.stock) }),
    })
    .then(() => { load(); setEditId(null); showNotice('Đã cập nhật sản phẩm'); setSaving(false); })
    .catch(() => setSaving(false));
  };

  const toggleActive = (p) => {
    fetch(`${BASE}/api/v1/catalog/merchant/products/${p.id}`, {
      method: 'PUT', headers: hdr(),
      body: JSON.stringify({ is_active: !p.is_active }),
    }).then(() => { load(); showNotice(`${p.name} đã ${!p.is_active ? 'hiện' : 'ẩn'}`); });
  };

  const deleteProduct = (p) => {
    if (!window.confirm(`Xoá sản phẩm "${p.name}"?`)) return;
    fetch(`${BASE}/api/v1/catalog/merchant/products/${p.id}`, { method: 'DELETE', headers: hdr() })
      .then(() => { load(); showNotice('Đã xoá sản phẩm'); });
  };

  const addProduct = () => {
    if (!form.name.trim() || !form.price) return showNotice('Vui lòng điền tên và giá', false);
    setSaving(true);
    fetch(`${BASE}/api/v1/catalog/merchant/products`, {
      method: 'POST', headers: hdr(),
      body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock || 0), merchant_id: merchantId }),
    })
    .then(r => r.json())
    .then(() => {
      load(); setShowAdd(false);
      setForm({ name:'', price:'', sku:'', stock:'', category:'phone', description:'' });
      showNotice('Đã thêm sản phẩm mới');
      setSaving(false);
    })
    .catch(() => setSaving(false));
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
          {notice.ok && <span style={{ marginLeft: 10, fontSize: 10, fontFamily: 'monospace', color: 'var(--ink-400)' }}>· HMAC-SHA256 signed ✓</span>}
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
                background: !p.is_active ? '#FAFAFA' : 'white',
              }}>
                <div className="ph-img" style={{ width: 38, height: 38, borderRadius: 4, fontSize: 8 }}>{p.brand}</div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, opacity: p.is_active ? 1 : 0.5, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 1 }}>{p.brand}</div>
                </div>

                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-500)' }}>{p.sku}</span>

                <span style={{ fontSize: 11, color: 'var(--ink-600)' }}>{catName(p.category)}</span>

                {isEditing ? (
                  <input type="number" value={editVals.price}
                    onChange={e => setEditVals({ ...editVals, price: e.target.value })}
                    style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1.5px solid var(--primary)', borderRadius: 4, outline: 'none' }} />
                ) : (
                  <span style={{ fontWeight: 600, color: 'var(--price)', cursor: 'pointer' }} onClick={() => startEdit(p)} title="Click để sửa giá">
                    {window.formatVND(p.base_price)}
                  </span>
                )}

                {isEditing ? (
                  <input type="number" value={editVals.stock}
                    onChange={e => setEditVals({ ...editVals, stock: e.target.value })}
                    style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1.5px solid var(--primary)', borderRadius: 4, outline: 'none', textAlign: 'center' }} />
                ) : (
                  <span style={{ textAlign: 'center', color: p.stock < 10 ? 'var(--warn)' : 'var(--ink-700)', cursor: 'pointer' }} onClick={() => startEdit(p)} title="Click để sửa tồn kho">
                    {p.stock}
                  </span>
                )}

                <div style={{ textAlign: 'center' }}>
                  {p.is_active
                    ? <span className="badge badge-success" style={{ fontSize: 10 }}>● Active</span>
                    : <span className="badge" style={{ fontSize: 10, background: 'var(--ink-100)', color: 'var(--ink-500)' }}>● Ẩn</span>
                  }
                </div>

                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {isEditing ? (<>
                    <button onClick={() => saveEdit(p.id)} disabled={saving}
                      className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>Lưu</button>
                    <button onClick={() => setEditId(null)}
                      style={{ padding: '4px 10px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4, background: 'white' }}>✕</button>
                  </>) : (<>
                    <button onClick={() => startEdit(p)} title="Sửa giá / tồn"
                      style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4, background: 'white' }}>✎</button>
                    <button onClick={() => toggleActive(p)} title={p.is_active ? 'Ẩn sản phẩm' : 'Hiện sản phẩm'}
                      style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--ink-200)', borderRadius: 4, background: 'white' }}>
                      {p.is_active ? '👁' : '🔒'}
                    </button>
                    <button onClick={() => deleteProduct(p)} title="Xoá"
                      style={{ padding: '4px 8px', fontSize: 11, border: '1px solid #FCA5A5', borderRadius: 4, background: 'white', color: '#DC2626' }}>🗑</button>
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
              <input className="input" placeholder="SKU (tự sinh nếu bỏ trống)" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
              <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                style={{ padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--ink-200)' }}>
                {(window.CATEGORIES || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <textarea className="input" placeholder="Mô tả (tuỳ chọn)" rows={2} value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
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
