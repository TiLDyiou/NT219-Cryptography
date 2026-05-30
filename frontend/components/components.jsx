// MMH Shopping — Shared components (Icon, Header, Footer, ProductCard, etc.)

// ─── Icons ───────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = 'currentColor', stroke = 1.8 }) => {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'search':       return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'cart':         return <svg {...props}><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 13h12l2-8H6"/></svg>;
    case 'user':         return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>;
    case 'home':         return <svg {...props}><path d="M3 11 12 3l9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z"/></svg>;
    case 'phone':        return <svg {...props}><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>;
    case 'laptop':       return <svg {...props}><rect x="3" y="5" width="18" height="11" rx="2"/><path d="M2 20h20"/></svg>;
    case 'shirt':        return <svg {...props}><path d="M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3-2 2h-4z"/></svg>;
    case 'dress':        return <svg {...props}><path d="M9 3v3l-5 13h16l-5-13V3M9 3h6M9 6h6"/></svg>;
    case 'beauty':       return <svg {...props}><path d="M9 2h6v4H9z"/><rect x="6" y="6" width="12" height="16" rx="2"/></svg>;
    case 'book':         return <svg {...props}><path d="M4 4h7a4 4 0 0 1 4 4v13M20 4h-2a4 4 0 0 0-3 1.5"/><path d="M4 4v17h7"/></svg>;
    case 'toy':          return <svg {...props}><circle cx="12" cy="10" r="6"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><path d="M9 13c1 1 4 1 6 0M8 16l-2 5M16 16l2 5"/></svg>;
    case 'sport':        return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>;
    case 'food':         return <svg {...props}><path d="M4 9h16l-2 11H6L4 9zM7 9V6a5 5 0 0 1 10 0v3"/></svg>;
    case 'shield':       return <svg {...props}><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"/></svg>;
    case 'shield-check': return <svg {...props}><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'lock':         return <svg {...props}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case 'key':          return <svg {...props}><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/></svg>;
    case 'check':        return <svg {...props}><path d="m5 12 5 5L20 7"/></svg>;
    case 'check-circle': return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>;
    case 'plus':         return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus':        return <svg {...props}><path d="M5 12h14"/></svg>;
    case 'x':            return <svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'arrow-right':  return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'arrow-left':   return <svg {...props}><path d="M19 12H5M11 5l-7 7 7 7"/></svg>;
    case 'chevron-right':return <svg {...props}><path d="m9 5 7 7-7 7"/></svg>;
    case 'chevron-down': return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case 'star':         return <svg {...props} fill={color}><path d="m12 2 3 7 7 .5-5.5 5L18 22l-6-3.5L6 22l1.5-7.5L2 9.5 9 9z"/></svg>;
    case 'star-outline': return <svg {...props}><path d="m12 2 3 7 7 .5-5.5 5L18 22l-6-3.5L6 22l1.5-7.5L2 9.5 9 9z"/></svg>;
    case 'truck':        return <svg {...props}><path d="M1 8h13v9H1zM14 11h5l3 3v3h-8"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>;
    case 'bell':         return <svg {...props}><path d="M6 19V11a6 6 0 1 1 12 0v8M3 19h18M10 22h4"/></svg>;
    case 'heart':        return <svg {...props}><path d="M12 21s-7-4.5-9-9c-1.5-3.5 1.5-7 5-7 2 0 3 1 4 2 1-1 2-2 4-2 3.5 0 6.5 3.5 5 7-2 4.5-9 9-9 9z"/></svg>;
    case 'tag':          return <svg {...props}><path d="m20 12-8 8-9-9V3h8z"/><circle cx="7" cy="7" r="1.5" fill={color}/></svg>;
    case 'gift':         return <svg {...props}><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M8 8a3 3 0 1 1 0-6c2 0 4 6 4 6M16 8a3 3 0 1 0 0-6c-2 0-4 6-4 6"/></svg>;
    case 'package':      return <svg {...props}><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/></svg>;
    case 'credit-card':  return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>;
    case 'pin':          return <svg {...props}><path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>;
    case 'fingerprint':  return <svg {...props}><path d="M6 11a6 6 0 0 1 12 0v3M9 14c0 3 1 5 2 7M15 11v3c0 2 .5 4 1.5 6M12 11v6M5 16c.5 1.5 1 3 2 5"/></svg>;
    case 'eye':          return <svg {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'globe':        return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>;
    case 'qr':           return <svg {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v3M14 21h7M21 17v4"/></svg>;
    case 'menu':         return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'mic':          return <svg {...props}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'camera':       return <svg {...props}><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></svg>;
    case 'wallet':       return <svg {...props}><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M17 15h2"/></svg>;
    case 'dashboard':    return <svg {...props}><rect x="3" y="3" width="8" height="10"/><rect x="13" y="3" width="8" height="6"/><rect x="13" y="11" width="8" height="10"/><rect x="3" y="15" width="8" height="6"/></svg>;
    case 'box':          return <svg {...props}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>;
    default:             return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
};

// ─── Placeholder Image ───────────────────────────────────────────────
const PhImg = ({ label, height = 180, bg, children }) => (
  <div className="ph-img" style={{ width: '100%', height, borderRadius: 6, background: bg || undefined }}>
    {children || `[ ${label || 'image'} ]`}
  </div>
);

// ─── Star Rating ─────────────────────────────────────────────────────
const Stars = ({ rating, size = 12, showNum = true }) => {
  const full = Math.floor(rating);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[0,1,2,3,4].map(i => (
        <Icon key={i} name={i < full ? 'star' : 'star-outline'} size={size} color="#FFB400" />
      ))}
      {showNum && <span style={{ marginLeft: 4, fontSize: size - 1, color: 'var(--ink-600)' }}>{rating.toFixed(1)}</span>}
    </div>
  );
};

// ─── Trust strip ─────────────────────────────────────────────────────
const TrustStrip = () => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 18,
    padding: '8px 14px', background: 'var(--success-soft)',
    borderRadius: 6, fontSize: 12, color: 'var(--ink-700)',
    border: '1px solid #BDE5CA',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon name="shield-check" size={14} color="var(--success)" />
      <span><b>mTLS</b> · Bảo mật đầu cuối</span>
    </div>
    <div style={{ width: 1, height: 14, background: '#BDE5CA' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon name="lock" size={14} color="var(--success)" />
      <span>Thanh toán <b>3-D Secure</b></span>
    </div>
    <div style={{ width: 1, height: 14, background: '#BDE5CA' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="secure-dot" />
      <span>Phiên đăng nhập đang được mã hoá</span>
    </div>
  </div>
);

// ─── Header ──────────────────────────────────────────────────────────
// catId có thể là string (1 category) hoặc array (nhiều category)
const NAV_CATEGORIES = [
  { label: 'Điện tử & Công nghệ', catId: ['phone', 'laptop'] },
  { label: 'Thời trang',          catId: ['fashion', 'fashion-w'] },
  { label: 'Nhà cửa & Đời sống', catId: ['home']  },
  { label: 'Sách & Giáo dục',     catId: ['book']  },
  { label: 'Thể thao & Sức khỏe', catId: ['sport'] },
];

const Header = ({ nav, cartCount, onNav, user, onLogout, onSearch, onCategory, onToast }) => {
  const [q, setQ] = React.useState('');

  const doSearch = () => {
    const term = q.trim();
    if (term) { onSearch && onSearch(term); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') doSearch();
  };

  return (
  <div style={{ background: 'var(--primary)', color: 'white' }}>
    {/* Top utility bar */}
    <div className="header-top-bar" style={{
      borderBottom: '1px solid rgba(255,255,255,0.12)',
      padding: '6px 24px', fontSize: 12,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', gap: 18, opacity: 0.9 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => onNav('merchant')}>Kênh người bán</span>
        <span style={{ cursor: 'pointer' }} onClick={() => onToast && onToast('Tính năng tải ứng dụng — coming soon')}>Tải ứng dụng</span>
        <span>Kết nối</span>
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', opacity: 0.9 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              onClick={() => onToast && onToast('Bạn chưa có thông báo mới')}>
          <Icon name="bell" size={13} /> Thông báo
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="globe" size={13} /> Tiếng Việt
        </span>
        {user ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => onNav('account')}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FFB400', color: 'var(--primary-dark)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{user.initial}</div>
              {user.name}
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ cursor: 'pointer', opacity: 0.85 }} onClick={onLogout}>Đăng xuất</span>
          </span>
        ) : (
          <span style={{ cursor: 'pointer' }} onClick={() => onNav('login')}>Đăng ký · Đăng nhập</span>
        )}
      </div>
    </div>

    {/* Main bar */}
    <div className="header-main-bar">
      {/* Logo */}
      <div onClick={() => onNav('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', padding: 2,
        }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/32/Ho_Chi_Minh_City_University_of_Information_Technology_Full_Logo.JPG"
               alt="UIT"
               style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>UIT Store</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Tốt & Nhanh — Mua sắm an toàn</div>
        </div>
      </div>

      {/* Search */}
      <div className="header-search-container" style={{ flex: 1, position: 'relative' }}>
        <div style={{
          background: 'white', borderRadius: 6,
          display: 'flex', alignItems: 'center', padding: '0 4px 0 14px', height: 40,
        }}>
          <Icon name="search" size={18} color="var(--ink-500)" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Bạn tìm gì hôm nay?"
            style={{
              flex: 1, border: 'none', outline: 'none', padding: '0 10px',
              background: 'transparent', color: 'var(--ink-900)', fontSize: 14,
            }}
          />
          <div style={{ display: 'flex', gap: 6, paddingRight: 4 }}>
            <button style={{ padding: '6px 8px', color: 'var(--ink-500)' }}
                    onClick={() => onToast && onToast('Tìm kiếm bằng ảnh — coming soon')}>
              <Icon name="camera" size={18}/>
            </button>
            <button style={{ padding: '6px 8px', color: 'var(--ink-500)' }}
                    onClick={() => onToast && onToast('Tìm kiếm bằng giọng nói — coming soon')}>
              <Icon name="mic" size={18}/>
            </button>
            <button className="btn btn-primary" style={{ padding: '6px 16px', borderRadius: 4 }} onClick={doSearch}>
              Tìm kiếm
            </button>
          </div>
        </div>
        <div className="header-suggestions" style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, opacity: 0.9 }}>
          {['iPhone 15', 'Tủ lạnh', 'Đắc nhân tâm', 'Nồi chiên không dầu', 'AirPods', 'Áo thun nam'].map(t => (
            <span key={t} style={{ cursor: 'pointer' }} onClick={() => { setQ(t); onSearch && onSearch(t); }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div onClick={() => onNav('cart')} style={{
        cursor: 'pointer', position: 'relative',
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
        borderRadius: 6, background: 'rgba(255,255,255,0.1)',
      }}>
        <Icon name="cart" size={20} />
        <span style={{ fontSize: 13 }}>Giỏ hàng</span>
        {cartCount > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: 4,
            background: '#FFB400', color: 'var(--primary-dark)',
            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
          }}>{cartCount}</div>
        )}
      </div>
    </div>

    {/* Nav strip */}
    <div className="header-nav-strip">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name="pin" size={13} />
        <span>Giao đến: <b>Q. Thủ Đức, TP. HCM</b></span>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 16, justifyContent: 'center' }}>
        {NAV_CATEGORIES.map(c => (
          <span key={c.catId} style={{ cursor: 'pointer' }} onClick={() => onCategory && onCategory(c.catId)}>
            {c.label}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.95 }}>
        <span className="secure-dot" />
        <span><b>HTTPS · TLS 1.3</b></span>
      </div>
    </div>
  </div>
  );
};

// ─── Footer ──────────────────────────────────────────────────────────
const Footer = () => (
  <div style={{
    background: 'white', borderTop: '1px solid var(--ink-200)',
    padding: '32px 24px', marginTop: 32,
  }}>
    <div className="footer-grid">
      {[
        { h: 'Hỗ trợ khách hàng', items: ['Trung tâm trợ giúp', 'UIT Store Care', 'Hướng dẫn đặt hàng', 'Chính sách đổi trả', 'Chính sách bảo mật'] },
        { h: 'Về UIT Store', items: ['Giới thiệu', 'Tuyển dụng', 'Điều khoản sử dụng', 'Bán hàng cùng UIT Store', 'Liên hệ truyền thông'] },
        { h: 'Hợp tác và liên kết', items: ['Quy chế hoạt động', 'Bán hàng đối tác', 'Affiliate', 'Đăng ký bán hàng', 'API & Developer Portal'] },
        { h: 'Chứng nhận bởi', items: ['Bộ Công Thương', 'PCI-DSS Compliant', 'ISO 27001', 'OAuth2 · OIDC', 'mTLS Service Mesh'] },
        { h: 'Phương thức thanh toán', items: ['Visa · Mastercard · JCB', 'Apple Pay · Google Pay', 'Momo · ZaloPay · VNPay', 'Chuyển khoản · COD', '3-D Secure 2.0 · Tokenization'] },
      ].map(col => (
        <div key={col.h}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>{col.h}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--ink-600)' }}>
            {col.items.map(i => <span key={i}>{i}</span>)}
          </div>
        </div>
      ))}
    </div>
    <div className="footer-bottom">
      <span>© 2026 UIT Store — Đồ án môn NT219 Cryptography · UIT</span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="badge badge-success"><Icon name="shield-check" size={11}/> mTLS · HMAC · 3DS</span>
        <span className="badge badge-primary"><Icon name="key" size={11}/> Vault KMS · Envelope encryption</span>
      </div>
    </div>
  </div>
);

// ─── ProductCard ─────────────────────────────────────────────────────
const ProductCard = ({ product, onClick, dense = false }) => {
  const phColors = ['#FFE5D9','#D9E8FF','#E5F4DD','#FFEACD','#F0E2FF','#FFE0E0','#D9F4F0','#FCE7F3','#FFF4D9','#E0F2FE','#FEE2E2','#DCFCE7'];
  const phColor  = phColors[parseInt(product.id.split('_')[1]) % phColors.length];

  return (
    <div className="card" onClick={onClick} style={{
      cursor: 'pointer', overflow: 'hidden', position: 'relative',
      transition: 'all 0.15s', border: '1px solid var(--ink-200)',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
    >
      {/* Image */}
      <div style={{
        position: 'relative', height: dense ? 160 : 180,
        background: phColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: 'var(--ink-500)', opacity: 0.7, padding: '4px 8px',
          border: '1px dashed var(--ink-400)', borderRadius: 4,
        }}>
          {product.brand} · {product.sku}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 10 }}>
        {product.official && (
          <div style={{ marginBottom: 4 }}>
            <span className="badge badge-primary" style={{ fontSize: 10 }}>
              <Icon name="shield-check" size={10} /> Chính hãng
            </span>
          </div>
        )}
        <div style={{
          fontSize: 13, lineHeight: 1.35, marginBottom: 6, fontWeight: 500,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', height: 36,
        }}>
          {product.name}
        </div>

        <div style={{ marginBottom: 4 }}>
          <span style={{ color: 'var(--price)', fontSize: 16, fontWeight: 700 }}>
            {window.formatVND(product.base_price)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-600)' }}>
          <Stars rating={product.rating} size={11} showNum={false} />
          <span>·</span>
          <span>Đã bán {product.sold > 1000 ? (product.sold/1000).toFixed(1) + 'k' : product.sold}</span>
        </div>

        {product.stock <= 50 && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--warn)' }}>
            Còn {product.stock} sản phẩm
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { Icon, PhImg, Stars, TrustStrip, Header, Footer, ProductCard });
