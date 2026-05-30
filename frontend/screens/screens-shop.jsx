// UIT Store — Home & Product Detail screens

// ─── Home Screen ─────────────────────────────────────────────────────
const HomeScreen = ({ onProduct, onNav, apiStatus, productsVersion, searchQuery, activeCategory, onCategory }) => {
  const [sortMode, setSortMode] = React.useState('all');
  const catalogLoading = !apiStatus || apiStatus.catalog === 'unknown' || apiStatus.catalog === 'loading';
  const catalogOk = apiStatus && apiStatus.catalog === 'ok';
  const catalogErr = apiStatus && apiStatus.catalog === 'error';

  const allProducts = React.useMemo(() => {
    let products = catalogOk ? (window.PRODUCTS || []) : [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      products = products.filter(p => p.category === activeCategory);
    }
    if (sortMode === 'newest')     products = [...products].sort((a, b) => b.id.localeCompare(a.id));
    if (sortMode === 'bestseller') products = [...products].sort((a, b) => b.sold - a.sold);
    if (sortMode === 'rating')     products = [...products].sort((a, b) => b.rating - a.rating);
    return products;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogOk, searchQuery, activeCategory, sortMode, productsVersion]);

  return (
    <div className="shop-container">
      {/* Sidebar categories */}
      <div className="shop-sidebar">
        <div className="card" style={{ padding: '12px 8px' }}>
          <div style={{ padding: '4px 10px 8px', fontWeight: 600, fontSize: 13, color: 'var(--ink-700)' }}>
            Danh mục
          </div>
          {window.CATEGORIES.map(cat => (
            <div key={cat.id}
              onClick={() => onCategory && onCategory(activeCategory === cat.id ? null : cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                fontSize: 13, transition: 'background 0.1s',
                background: activeCategory === cat.id ? 'var(--primary-tint)' : 'transparent',
                color: activeCategory === cat.id ? 'var(--primary)' : 'var(--ink-700)',
                fontWeight: activeCategory === cat.id ? 600 : 400,
                borderLeft: activeCategory === cat.id ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              <Icon name={cat.icon} size={16} color={activeCategory === cat.id ? 'var(--primary)' : 'var(--ink-400)'} />
              <span>{cat.name}</span>
            </div>
          ))}
        </div>

        {/* Crypto info card */}
        <div className="card" style={{
          marginTop: 12, padding: 14,
          background: 'linear-gradient(135deg, #E8F1FB, #F0F6FE)',
          border: '1px solid var(--primary-soft)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon name="shield-check" size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary)' }}>An toàn UIT Store</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-700)', lineHeight: 1.5 }}>
            Toàn bộ giao tiếp giữa Frontend ↔ API Gateway sử dụng <b>TLS 1.3</b>.
            Giao tiếp service-to-service được bảo vệ bằng <b>mTLS</b> và <b>HMAC signing</b>.
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10,
            fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-600)',
          }}>
            <div>✓ OAuth2 + PKCE</div>
            <div>✓ 3-D Secure (3DS2 / SCA)</div>
            <div>✓ Tokenization (no PAN)</div>
            <div>✓ HashiCorp Vault KMS</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Hero banner */}
        <div className="hero-grid">
          <div style={{
            height: 280, borderRadius: 10, overflow: 'hidden',
            background: 'linear-gradient(115deg, #1063C2 0%, #0A4B97 50%, #082F66 100%)',
            position: 'relative', color: 'white', padding: 28,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: 4,
                background: 'rgba(255, 215, 0, 0.2)', color: '#FFD600',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 12,
              }}>
                UIT STORE · AN TOÀN & TIN CẬY
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                Mua sắm an toàn<br/>trên nền tảng UIT Store
              </div>
              <div style={{ marginTop: 12, fontSize: 14, opacity: 0.9, maxWidth: 340 }}>
                Thanh toán mã hoá <b style={{ color: '#FFD600' }}>3-D Secure</b>. Không lưu số thẻ — tokenization PSP.
                Toàn bộ dữ liệu được bảo vệ bởi <b style={{ color: '#FFD600' }}>TLS 1.3</b>.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn" style={{ background: '#FFD600', color: '#082F66', fontWeight: 600 }}
                onClick={() => { const first = allProducts[0]; if (first) onProduct(first.id); }}
                disabled={allProducts.length === 0}>
                Khám phá ngay <Icon name="arrow-right" size={14}/>
              </button>
            </div>
            <div style={{
              position: 'absolute', right: -40, top: -40, width: 200, height: 200,
              borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
            }} />
            <div style={{
              position: 'absolute', right: 40, bottom: 30, width: 80, height: 80,
              borderRadius: '50%', border: '2px dashed rgba(255,215,0,0.4)',
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              flex: 1, borderRadius: 10, padding: 18, color: 'white',
              background: 'linear-gradient(135deg, #0A4B97, #1063C2)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>MUA SẮM AN TOÀN</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>Thanh toán 3-D Secure</div>
              </div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>Xác thực 2 lớp · Tokenization PSP</div>
            </div>
            <div style={{
              flex: 1, borderRadius: 10, padding: 18, color: 'white',
              background: 'linear-gradient(135deg, #16A34A, #0F7434)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>BẢO VỆ DỮ LIỆU</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>Vault KMS · Field-level</div>
              </div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>Mã hoá địa chỉ · PII · Khóa HSM</div>
            </div>
          </div>
        </div>

        {/* Platform security features strip */}
        <div className="security-strip">
          {[
            { icon: 'lock',         title: 'TLS 1.3 End-to-End',      sub: 'Bảo mật toàn đường truyền' },
            { icon: 'shield-check', title: '3-D Secure 2.0',           sub: 'Xác thực giao dịch 2 lớp' },
            { icon: 'key',          title: 'Tokenization (no PAN)',     sub: 'Không lưu số thẻ thanh toán' },
            { icon: 'fingerprint',  title: 'OAuth2 + PKCE · WebAuthn', sub: 'Xác thực người dùng hiện đại' },
          ].map(f => (
            <div key={f.title} style={{
              padding: 12, borderRadius: 8, background: 'var(--primary-tint)',
              border: '1px solid var(--primary-soft)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Icon name={f.icon} size={22} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-600)', marginTop: 2 }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* API connection status strip */}
        {(catalogLoading || catalogOk || catalogErr) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
            background: catalogOk ? '#f0faf3' : (catalogLoading ? '#eff6ff' : '#fff7ed'),
            border: '1px solid ' + (catalogOk ? '#bde5ca' : (catalogLoading ? '#bfdbfe' : '#fed7aa')),
            borderRadius: 6, fontSize: 11, marginBottom: 8,
          }}>
            <Icon
              name={catalogOk ? 'check-circle' : (catalogLoading ? 'box' : 'bell')}
              size={13}
              color={catalogOk ? 'var(--success)' : (catalogLoading ? 'var(--primary)' : 'var(--warn)')}
            />
            {catalogOk && <span style={{ color: 'var(--success)' }}><b>Catalog Service</b> kết nối thành công · {window.UitAPI.backendUrl} · {allProducts.length} sản phẩm</span>}
            {catalogLoading && <span style={{ color: 'var(--primary)' }}><b>Catalog Service</b> đang tải sản phẩm</span>}
            {catalogErr && <span style={{ color: '#a56700' }}><b>Catalog Service</b> chưa trả dữ liệu sản phẩm</span>}
          </div>
        )}

        {/* Product grid */}
        <div className="section-head">
          <h2>
            {searchQuery
              ? `Kết quả cho "${searchQuery}" (${allProducts.length})`
              : activeCategory
                ? `${(window.CATEGORIES || []).find(c => c.id === activeCategory)?.name || activeCategory} (${allProducts.length})`
                : 'Sản phẩm từ catalog'}
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(searchQuery || activeCategory) && (
              <button onClick={() => { setSortMode('all'); onCategory && onCategory(null); }}
                style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}>
                ✕ Xoá bộ lọc
              </button>
            )}
            {[
              { key: 'all',        label: 'Tất cả' },
              { key: 'newest',     label: 'Mới nhất' },
              { key: 'bestseller', label: 'Bán chạy' },
              { key: 'rating',     label: 'Đánh giá cao' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSortMode(key)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12,
                background: sortMode === key ? 'var(--primary)' : 'white',
                color: sortMode === key ? 'white' : 'var(--ink-700)',
                border: sortMode === key ? 'none' : '1px solid var(--ink-200)',
              }}>{label}</button>
            ))}
          </div>
        </div>
        {allProducts.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-500)' }}>
            <Icon name="search" size={40} color="var(--ink-300)" />
            <div style={{ marginTop: 12, fontSize: 15 }}>
              {catalogLoading
                ? 'Đang đợi Catalog Service trả sản phẩm'
                : catalogErr
                  ? 'Catalog Service chưa trả dữ liệu sản phẩm'
                  : 'Không tìm thấy sản phẩm phù hợp'}
            </div>
            {catalogOk && (
              <button onClick={() => { setSortMode('all'); onCategory && onCategory(null); }}
                className="btn btn-outline" style={{ marginTop: 16, padding: '8px 20px' }}>
                Xem tất cả sản phẩm
              </button>
            )}
          </div>
        ) : (
          <div className="product-grid">
            {allProducts.map(p => (
              <ProductCard key={p.id} product={p} onClick={() => onProduct(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Product Detail Screen ───────────────────────────────────────────
const ProductScreen = ({ productId, onAddToCart, onNav, onBuyNow, wishlist, onToggleWishlist }) => {
  const products = window.PRODUCTS || [];
  const product  = products.find(p => p.id === productId) || products[0];
  const [qty, setQty] = React.useState(1);
  const [selectedColor, setSelectedColor] = React.useState(0);
  const [activeThumb, setActiveThumb] = React.useState(0);

  if (!product) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-500)' }}>
        <Icon name="box" size={44} color="var(--ink-300)" />
        <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600, color: 'var(--ink-700)' }}>
          Chưa có sản phẩm từ Catalog Service
        </div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          Trang này chỉ hiển thị sản phẩm được trả về từ catalog.
        </div>
        <button onClick={() => onNav('home')} className="btn btn-outline" style={{ marginTop: 16, padding: '8px 20px' }}>
          Về trang chủ
        </button>
      </div>
    );
  }

  const merchant = {
    name: product.merchant_name || product.brand || 'Nhà bán hàng UIT Store',
    is_verified: false,
    followers: '0',
    rating: 'N/A',
    since: 'N/A',
  };

  const isWishlisted = wishlist && wishlist.includes(product.id);

  const handleShare = () => {
    const url = window.location.origin + '/?product=' + product.id;
    if (navigator.share) {
      navigator.share({ title: product.name, url });
    } else {
      navigator.clipboard && navigator.clipboard.writeText(url);
      console.info('Copied product URL:', url);
    }
  };

  const phColors = ['#FFE5D9','#D9E8FF','#E5F4DD','#FFEACD','#F0E2FF','#FFE0E0','#D9F4F0','#FCE7F3','#FFF4D9','#E0F2FE','#FEE2E2','#DCFCE7'];
  const phColor  = phColors[parseInt(product.id.split('_')[1]) % phColors.length];
  const related  = products.filter(p => p.id !== product.id).slice(0, 5);

  const weightLabel = product.weight_g >= 1000
    ? `${(product.weight_g / 1000).toFixed(1)} kg`
    : `${product.weight_g} g`;

  const specRows = [
    ['SKU',         product.sku],
    ['Thương hiệu', product.brand],
    ...(product.warranty_months > 0 ? [['Bảo hành', `${product.warranty_months} tháng chính hãng`]] : []),
    ['Trọng lượng', weightLabel],
    ['Tồn kho',     `${product.stock} sản phẩm`],
    ['Mã sản phẩm', product.id],
    ...Object.entries(product.specs || {}),
  ];

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 12 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => onNav('home')}>Trang chủ</span>
        <Icon name="chevron-right" size={11} />
        <span>{window.CATEGORIES.find(c => c.id === product.category)?.name || 'Sản phẩm'}</span>
        <Icon name="chevron-right" size={11} />
        <span style={{ color: 'var(--ink-700)' }}>{product.name}</span>
      </div>

      <div className="product-detail-grid">
        {/* Gallery */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{
            width: '100%', height: 380, borderRadius: 6, background: phColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: 'var(--ink-500)', padding: '6px 12px',
              border: '1px dashed var(--ink-400)', borderRadius: 4, background: 'rgba(255,255,255,0.6)',
            }}>
              {product.brand} · {product.sku}
            </div>
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              padding: '4px 10px', background: 'rgba(0,0,0,0.6)', color: 'white',
              fontSize: 11, borderRadius: 4,
            }}>{activeThumb + 1} / 8</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} onClick={() => setActiveThumb(i)} style={{
                width: 56, height: 56, borderRadius: 4, background: phColor,
                opacity: i === activeThumb ? 1 : 0.45, cursor: 'pointer',
                border: i === activeThumb ? '2px solid var(--primary)' : '1px solid var(--ink-200)',
                transition: 'opacity 0.15s, border-color 0.15s',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, fontSize: 12 }}>
            <button onClick={() => onToggleWishlist && onToggleWishlist(product.id)}
              style={{ flex: 1, padding: '8px', border: '1px solid var(--ink-200)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                color: isWishlisted ? '#E11D48' : 'var(--ink-700)',
                background: isWishlisted ? '#FFF1F2' : 'white',
                borderColor: isWishlisted ? '#FDA4AF' : 'var(--ink-200)',
              }}>
              <Icon name="heart" size={14} color={isWishlisted ? '#E11D48' : 'currentColor'}/>
              {isWishlisted ? 'Đã yêu thích' : 'Yêu thích'}
            </button>
            <button onClick={handleShare}
              style={{ flex: 1, padding: '8px', border: '1px solid var(--ink-200)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--ink-700)' }}>
              Chia sẻ
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="card" style={{ padding: 20 }}>
          {product.official && (
            <span className="badge badge-primary" style={{ marginBottom: 8 }}>
              <Icon name="shield-check" size={11}/> Hàng chính hãng · UIT Mall
            </span>
          )}
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '6px 0 10px', lineHeight: 1.3 }}>
            {product.name}
          </h1>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, fontSize: 13 }}>
            <Stars rating={product.rating} size={14} />
            <span style={{ color: 'var(--ink-300)' }}>|</span>
            <span style={{ color: 'var(--ink-600)' }}>{product.rating_count.toLocaleString()} đánh giá</span>
            <span style={{ color: 'var(--ink-300)' }}>|</span>
            <span style={{ color: 'var(--ink-600)' }}>Đã bán {product.sold.toLocaleString()}</span>
          </div>

          {/* Price block */}
          <div style={{
            padding: 16, background: 'var(--ink-100)',
            borderRadius: 8, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ color: 'var(--price)', fontSize: 32, fontWeight: 700 }}>
                {window.formatVND(product.base_price)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>/ sản phẩm</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-600)' }}>
              Còn <b style={{ color: product.stock <= 20 ? 'var(--warn)' : 'var(--ink-900)' }}>{product.stock}</b> sản phẩm trong kho
            </div>
          </div>

          {/* Variant */}
          <div style={{ marginBottom: 16 }}>
            {product.color_options && product.color_options.length > 0 && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <div style={{ width: 90, color: 'var(--ink-500)', fontSize: 13, paddingTop: 6 }}>Màu sắc</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {product.color_options.map((c, i) => (
                    <button key={c} onClick={() => setSelectedColor(i)} style={{
                      padding: '6px 12px', fontSize: 12,
                      border: selectedColor === i ? '2px solid var(--primary)' : '1px solid var(--ink-200)',
                      borderRadius: 4,
                      color: selectedColor === i ? 'var(--primary)' : 'var(--ink-700)',
                      background: selectedColor === i ? 'var(--primary-tint)' : 'white',
                    }}>{c}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 90, color: 'var(--ink-500)', fontSize: 13, paddingTop: 6 }}>Số lượng</div>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--ink-200)', borderRadius: 4 }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: '6px 10px' }}><Icon name="minus" size={12}/></button>
                <span style={{ padding: '0 16px', minWidth: 40, textAlign: 'center', borderLeft: '1px solid var(--ink-200)', borderRight: '1px solid var(--ink-200)' }}>{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))} style={{ padding: '6px 10px' }}><Icon name="plus" size={12}/></button>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onAddToCart(product, qty)} className="btn" style={{
              flex: 1, background: 'var(--price-soft)', color: 'var(--price)',
              border: '1px solid var(--price)', padding: '12px',
            }}>
              <Icon name="cart" size={16}/> Thêm vào giỏ
            </button>
            <button onClick={() => onBuyNow(product, qty)} className="btn btn-price" style={{ flex: 1, padding: '12px', fontSize: 15 }}>
              Mua ngay
            </button>
          </div>

          {/* Security info */}
          <div style={{
            marginTop: 18, padding: 12, background: 'var(--success-soft)',
            border: '1px solid #BDE5CA', borderRadius: 6,
            display: 'flex', gap: 12, alignItems: 'start',
          }}>
            <Icon name="shield-check" size={20} color="var(--success)" />
            <div style={{ fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.55 }}>
              <b>Mua sắm an toàn cùng UIT Store.</b> Mọi giao dịch được mã hoá <code style={{ background: 'white', padding: '0 4px', borderRadius: 2, fontSize: 11 }}>TLS 1.3</code>.
              Thanh toán xử lý qua PSP với token hoá thẻ — UIT Store <b>không lưu</b> số PAN. Hỗ trợ 3-D Secure 2.0 cho mọi thẻ.
            </div>
          </div>
        </div>

        {/* Merchant + delivery */}
        <div className="product-merchant-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}>Bán bởi</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 6, background: 'var(--primary-tint)',
                border: '1px solid var(--primary-soft)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: 16,
              }}>{merchant.name.substring(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {merchant.name.length > 18 ? merchant.name.substring(0, 18) + '…' : merchant.name}
                  {merchant.is_verified && <Icon name="check-circle" size={12} color="var(--primary)" />}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{merchant.followers} người theo dõi</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 11, textAlign: 'center' }}>
              <div style={{ padding: 6, background: 'var(--ink-100)', borderRadius: 4 }}>
                <div style={{ color: 'var(--ink-500)' }}>Đánh giá</div>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{merchant.rating}/5</div>
              </div>
              <div style={{ padding: 6, background: 'var(--ink-100)', borderRadius: 4 }}>
                <div style={{ color: 'var(--ink-500)' }}>Tham gia</div>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{merchant.since}</div>
              </div>
            </div>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: 12, padding: '6px', fontSize: 12 }}
              onClick={() => onNav('merchant')}>
              Xem shop
            </button>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Vận chuyển</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-600)' }}>Giao đến</span>
                <span style={{ fontWeight: 500 }}>Thủ Đức, TP. HCM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-600)' }}>Phí giao hàng</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Miễn phí</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-600)' }}>Nhận hàng</span>
                <span style={{ fontWeight: 500 }}>{(function(){
                  var d = new Date(); var added = 0;
                  while(added < 3){ d.setDate(d.getDate()+1); if(d.getDay()!==0&&d.getDay()!==6) added++; }
                  return ['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]+', '+d.getDate()+'/'+(d.getMonth()+1);
                })()}</span>
              </div>
            </div>
            <div style={{
              marginTop: 12, padding: 8, background: 'var(--warn-soft)', borderRadius: 4,
              fontSize: 11, color: '#A56700', display: 'flex', gap: 6, alignItems: 'start',
            }}>
              <Icon name="gift" size={14}/>
              Đổi trả miễn phí trong 7 ngày
            </div>
          </div>
        </div>
      </div>

      {/* Description & specs */}
      <div className="product-specs-grid">
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Mô tả sản phẩm</h3>
          <div style={{ color: 'var(--ink-700)', lineHeight: 1.7, fontSize: 13 }}>
            <p>{product.description}</p>
            {product.warranty_months > 0 && (
              <p>Sản phẩm đi kèm bảo hành chính hãng <b>{product.warranty_months} tháng</b>, hộp niêm phong và đầy đủ phụ kiện theo tiêu chuẩn nhà sản xuất.</p>
            )}
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Thông số chi tiết</h3>
          <div style={{ fontSize: 13 }}>
            {specRows.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', padding: '7px 0', borderBottom: '1px dashed var(--ink-200)' }}>
                <span style={{ width: 140, flexShrink: 0, color: 'var(--ink-500)' }}>{k}</span>
                <span style={{ flex: 1, fontFamily: k === 'SKU' || k === 'Mã sản phẩm' ? 'JetBrains Mono, monospace' : 'inherit' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related */}
      <div style={{ marginTop: 20 }}>
        <div className="section-head"><h2>Sản phẩm tương tự</h2></div>
        <div className="product-grid">
          {related.map(p => (
            <ProductCard key={p.id} product={p} onClick={() => onNav('product', p.id)} />
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { HomeScreen, ProductScreen });
