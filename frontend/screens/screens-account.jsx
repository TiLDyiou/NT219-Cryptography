// UIT Store — Login (with MFA) and Merchant Dashboard

// ─── Login Screen: Keycloak PKCE redirect ──────────────────────────
const LoginScreen = ({ onLogin, onNav }) => {
  React.useEffect(() => {
    if (window.UitAuth) window.UitAuth.loginRedirect();
  }, []);

  return (
    <div className="login-container">
      <div className="login-grid">
        <div className="login-visual">
          <div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: 16, marginBottom: 24 }}>UIT</div>
            <h2 style={{ fontSize: 26, lineHeight: 1.25, margin: '0 0 12px' }}>Đang chuyển sang Keycloak</h2>
            <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6, maxWidth: 340 }}>
              Form đăng nhập custom được xử lý trong Keycloak theme để mật khẩu không đi qua SPA.
            </div>
          </div>
        </div>
        <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Đăng nhập an toàn</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.6, marginBottom: 18 }}>
            UIT Store dùng Authorization Code + PKCE. PKCE giúp SPA lấy token mà không giữ mật khẩu.
          </div>
          <button onClick={() => window.UitAuth && window.UitAuth.loginRedirect()} className="btn btn-primary" style={{ width: '100%', padding: 12 }}>
            Tiếp tục đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Merchant Dashboard ──────────────────────────────────────────────
const MerchantScreen = ({ onNav, user, setUser }) => {
  const [merchantProfile, setMerchantProfile] = React.useState(null);
  const [merchantChecked, setMerchantChecked] = React.useState(false);
  const [showRegForm, setShowRegForm] = React.useState(false);
  const [regShopName, setRegShopName] = React.useState('');
  const [regShopCode, setRegShopCode] = React.useState('');
  const [regLoading, setRegLoading] = React.useState(false);
  const [regError, setRegError] = React.useState('');
  const [regSuccess, setRegSuccess] = React.useState(false);

  const currentMerchantProfile = merchantProfile && user && merchantProfile.id === user.id ? merchantProfile : null;
  const merchantId = (currentMerchantProfile && currentMerchantProfile.id) || (user && user.id);
  const shopName = (currentMerchantProfile && currentMerchantProfile.metadata_json && currentMerchantProfile.metadata_json.shop_name)
    || (user ? (user.name || user.email || 'Seller Center') : 'Seller Center');
  const products = (window.PRODUCTS || []).filter(p => p.merchant_id === merchantId).slice(0, 6);
  const [activeSection, setActiveSection] = React.useState('dash');
  const [orders, setOrders] = React.useState([]);
  const isMerchant = !!currentMerchantProfile;

  React.useEffect(() => {
    if (!user || !window.UitAPI || !window.UitAPI.merchant || !window.UitAPI.merchant.me) {
      setMerchantProfile(null);
      setMerchantChecked(!!user);
      return;
    }

    let cancelled = false;
    let timeoutId = null;
    setMerchantChecked(false);
    const checkTimeout = new Promise(resolve => {
      timeoutId = setTimeout(() => resolve(null), 2500);
    });
    Promise.race([
      window.UitAPI.merchant.me().catch(() => null),
      checkTimeout,
    ])
      .then(res => {
        if (!cancelled && res && res.data) setMerchantProfile(res.data);
      })
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) setMerchantChecked(true);
      });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user && user.id]);

  React.useEffect(() => {
    if (!merchantId || !isMerchant) return;
    const BASE = window.UitAPI && window.UitAPI.backendUrl;
    if (!BASE) return;
    const t = window.UitAuth && window.UitAuth.getAccessToken && window.UitAuth.getAccessToken();
    const headers = t
      ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }
      : { 'Content-Type': 'application/json', 'X-User-Id': user && user.id };

    fetch(`${BASE}/api/v1/orders/merchant/orders?merchant_id=${merchantId}`, { headers })
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.data)) {
          setOrders(d.data);
        }
      })
      .catch(e => console.error("Error loading merchant orders in dashboard:", e));
  }, [merchantId, user, isMerchant]);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length;

  const SECTION_TITLES = {
    dash: 'Tổng quan', orders: 'Đơn hàng', products: 'Sản phẩm',
    promo: 'Khuyến mãi', analytics: 'Phân tích bán hàng',
    finance: 'Tài chính · Thanh toán', security: 'Bảo mật shop', settings: 'Cài đặt',
  };

  // Delegate render to section component (loaded via separate script tags)
  const renderSection = () => {
    const props = { merchantId, user };
    const map = {
      orders:    window.MerchantOrdersSection,
      products:  window.MerchantProductsSection,
      finance:   window.MerchantFinanceSection,
      security:  window.MerchantSecuritySection,
      analytics: window.MerchantAnalyticsSection,
      promo:     window.MerchantPromoSection,
      settings:  window.MerchantSettingsSection,
    };
    const Comp = map[activeSection];
    if (Comp) return React.createElement(Comp, props);
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-500)' }}>
        Section đang được phát triển...
      </div>
    );
  };

  // Dynamic KPIs calculations
  const productsCount = (window.PRODUCTS || []).filter(p => p.merchant_id === merchantId).length;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 1);
  
  const todayRevenue = orders.filter(o => {
    if (o.status === 'cancelled') return false;
    const oDate = new Date(o.created_at || new Date());
    return oDate >= today && oDate < nextDay;
  }).reduce((sum, o) => sum + o.total_amount, 0);

  const stats = [
    { label: 'Doanh thu hôm nay', value: todayRevenue.toLocaleString('vi-VN') + 'đ', delta: 'Cập nhật', positive: true, icon: 'wallet' },
    { label: 'Đơn hàng', value: orders.length.toString(), delta: pendingCount > 0 ? `${pendingCount} chờ duyệt` : 'Đã xử lý', positive: pendingCount === 0, icon: 'package' },
    { label: 'Sản phẩm đang bán', value: productsCount.toString(), delta: 'Đang hoạt động', positive: true, icon: 'tag' },
  ];

  // Dynamic Chart calculations
  const getRevenueLast7Days = () => {
    const data = [];
    const days = ['CN','T2','T3','T4','T5','T6','T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      d.setHours(0,0,0,0);
      const endD = new Date(d);
      endD.setDate(d.getDate() + 1);
      
      const dayRev = orders.filter(o => {
        if (o.status === 'cancelled') return false;
        const oDate = new Date(o.created_at || new Date());
        return oDate >= d && oDate < endD;
      }).reduce((sum, o) => sum + o.total_amount, 0);
      
      data.push({ d: dayName, realAmount: dayRev });
    }
    const maxRev = Math.max(...data.map(i => i.realAmount), 1);
    return data.map(item => ({
      d: item.d,
      v: Math.round((item.realAmount / maxRev) * 100),
      realAmount: item.realAmount
    }));
  };
  const chartData = getRevenueLast7Days();

  if (!user) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <Icon name="lock" size={40} color="var(--ink-400)" />
          <div style={{ fontSize: 20, fontWeight: 600, margin: '12px 0 8px' }}>Cần đăng nhập người bán</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 20, lineHeight: 1.6 }}>
            Seller Center chỉ hiển thị dữ liệu từ backend sau khi đăng nhập.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => onNav('login')} className="btn btn-outline" style={{ padding: '10px 24px' }}>
              Đăng nhập
            </button>
            <button onClick={() => onNav('home')} className="btn btn-outline" style={{ padding: '10px 24px' }}>
              Về trang mua sắm
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!merchantChecked) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Đang kiểm tra trạng thái người bán</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.6 }}>
            Hệ thống đang xác nhận cửa hàng gắn với tài khoản hiện tại.
          </div>
        </div>
      </div>
    );
  }

  if (regSuccess) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#DEF7EC',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          }}>
            <Icon name="check-circle" size={40} color="#10B981" stroke={3} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, color: '#10B981' }}>Đăng ký thành công!</div>
          <div style={{ fontSize: 14, color: 'var(--ink-600)', lineHeight: 1.6 }}>
            Cửa hàng <b>{regShopName}</b> đã được tạo trên hệ thống.<br />Hệ thống đang chuẩn bị chuyển hướng bạn đến Dashboard...
          </div>
        </div>
      </div>
    );
  }

  // Luồng Đăng ký người bán hoặc chặn quyền truy cập
  if (!isMerchant) {
    const handleRegisterSubmit = () => {
      setRegError('');
      const nameVal = regShopName.trim();
      const codeVal = regShopCode.trim();
      if (!nameVal || !codeVal) {
        setRegError('Vui lòng điền đầy đủ tên cửa hàng và mã định danh.');
        return;
      }
      if (!/^[a-z0-9-_]+$/.test(codeVal)) {
        setRegError('Mã định danh chỉ được chứa chữ thường không dấu, số, gạch ngang (-) và gạch dưới (_).');
        return;
      }
      setRegLoading(true);
      window.UitAPI.merchant.register({ name: nameVal, code: codeVal })
        .then(res => {
          if (res && res.data) setMerchantProfile(res.data);
          setRegSuccess(true);
          setTimeout(() => {
            const updatedUser = {
              ...user,
              roles: (user.roles || []).includes('merchant') ? user.roles : [...(user.roles || []), 'merchant']
            };
            if (setUser) setUser(updatedUser);
            try {
              sessionStorage.setItem('nt219_user', JSON.stringify(updatedUser));
            } catch (e) {}
            setShowRegForm(false);
            setRegSuccess(false);
          }, 1200);
        })
        .catch(err => {
          const msg = err.message || 'Có lỗi xảy ra trong quá trình đăng ký.';
          if (/đã được đăng ký|already registered/i.test(msg)) {
            window.UitAPI.merchant.me()
              .then(res => {
                if (res && res.data) {
                  setMerchantProfile(res.data);
                  setShowRegForm(false);
                  setRegError('');
                }
              })
              .catch(() => setRegError(msg));
            return;
          }
          setRegError(msg);
        })
        .finally(() => {
          setRegLoading(false);
        });
    };

    if (showRegForm) {
      return (
        <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
          <div className="card" style={{ padding: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Đăng ký Kênh người bán</div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 20 }}>
              Mở rộng kinh doanh của bạn bằng cách tạo một cửa hàng trên hệ thống.
            </div>

            {regError && (
              <div style={{ padding: '10px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 12, color: '#B91C1C', marginBottom: 16 }}>
                {regError}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Tên cửa hàng (Shop Name)</label>
              <input className="input" value={regShopName} onChange={e => {
                setRegShopName(e.target.value);
                if (regShopCode === '') {
                  setRegShopCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''));
                }
              }} placeholder="Tech World, Tiệm Sách Nhỏ..." disabled={regLoading} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6, display: 'block' }}>Mã định danh (Shop Code / Slug)</label>
              <input className="input" value={regShopCode} onChange={e => setRegShopCode(e.target.value)}
                placeholder="techworld, tiem-sach-nho" disabled={regLoading} />
              <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>
                Dùng làm URL định danh cho cửa hàng. Chỉ gồm chữ thường, số và gạch ngang.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleRegisterSubmit} disabled={regLoading} className="btn btn-primary" style={{ flex: 1, padding: '10px 20px' }}>
                {regLoading ? 'Đang xử lý...' : 'Xác nhận tạo Shop'}
              </button>
              <button onClick={() => setShowRegForm(false)} disabled={regLoading} className="btn btn-outline" style={{ padding: '10px 20px' }}>
                Quay lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center', border: '1px solid #FCA5A5' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#FEE2E2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          }}>
            <Icon name="shield-check" size={40} color="#EF4444" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, margin: '12px 0 8px', color: '#B91C1C' }}>Bạn chưa có cửa hàng người bán</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 24, lineHeight: 1.6 }}>
            Tài khoản <b>{user.email || user.name}</b> đang là tài khoản mua hàng. Hãy tạo cửa hàng để bắt đầu bán sản phẩm trên UIT Store.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexDirection: 'column' }}>
            <button onClick={() => setShowRegForm(true)} className="btn btn-primary" style={{ padding: '12px 24px', fontWeight: 600 }}>
              Đăng ký làm Người bán ngay
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => window.UitAuth && window.UitAuth.logout()} className="btn btn-outline" style={{ flex: 1, padding: '10px 20px' }}>
                Đăng nhập tài khoản khác
              </button>
              <button onClick={() => onNav('home')} className="btn btn-outline" style={{ flex: 1, padding: '10px 20px' }}>
                Về trang mua sắm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-container">
      {/* Sidebar */}
      <div className="merchant-sidebar">
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--ink-100)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>SELLER CENTER</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{shopName}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="badge badge-success" style={{ fontSize: 10 }}>
              <Icon name="check-circle" size={10}/> Mall
            </span>
            <span className="badge badge-primary" style={{ fontSize: 10 }}>
              <Icon name="key" size={10}/> Keycloak
            </span>
          </div>
          {user && (
            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="lock" size={10} color="var(--success)" />
              <span style={{ fontFamily: 'monospace' }}>{user.email}</span>
            </div>
          )}
        </div>
        {[
          { id: 'dash',     icon: 'dashboard',   label: 'Tổng quan' },
          { id: 'orders',   icon: 'package',     label: 'Đơn hàng',              count: pendingCount },
          { id: 'products', icon: 'tag',          label: 'Sản phẩm' },
          { id: 'promo',    icon: 'gift',         label: 'Khuyến mãi' },
          { id: 'analytics',icon: 'eye',          label: 'Phân tích bán hàng' },
          { id: 'finance',  icon: 'wallet',       label: 'Tài chính · Thanh toán' },
          { id: 'security', icon: 'shield-check', label: 'Bảo mật shop' },
          { id: 'settings', icon: 'lock',         label: 'Cài đặt' },
        ].map(item => (
          <div key={item.id} onClick={() => setActiveSection(item.id)} style={{
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: activeSection === item.id ? 'var(--primary)' : 'var(--ink-700)',
            background: activeSection === item.id ? 'var(--primary-tint)' : 'transparent',
            borderLeft: `3px solid ${activeSection === item.id ? 'var(--primary)' : 'transparent'}`,
            cursor: 'pointer',
          }}>
            <Icon name={item.icon} size={16} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {typeof item.count === 'number' && item.count > 0 && (
              <span style={{
                fontSize: 10, padding: '1px 5px', background: 'var(--price)',
                color: 'white', borderRadius: 8, fontWeight: 600,
              }}>{item.count}</span>
            )}
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 24, background: 'var(--bg)', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{SECTION_TITLES[activeSection] || activeSection}</h1>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 2 }}>Chào mừng trở lại! Hôm nay là {['CN','T2','T3','T4','T5','T6','T7'][new Date().getDay()]}, {new Date().getDate()}/{new Date().getMonth()+1}/{new Date().getFullYear()}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => setActiveSection('products')}>
              <Icon name="plus" size={14}/> Thêm sản phẩm
            </button>
            <button onClick={() => onNav('home')} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: 13, border: '1px solid var(--ink-200)' }}>
              ← Về trang mua sắm
            </button>
          </div>
        </div>

        {/* Section components */}
        {activeSection !== 'dash' && renderSection()}

        {/* Dashboard — chỉ hiển thị khi activeSection === 'dash' */}
        {activeSection === 'dash' && <>

        {/* Security alert with crypto info */}
        <div className="card" style={{
          padding: 16, marginBottom: 18,
          background: 'linear-gradient(90deg, #E8F7EE, #F0FAF3)',
          border: '1px solid #BDE5CA',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <Icon name="shield-check" size={28} color="var(--success)" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Shop của bạn đang bảo mật ở mức cao</div>
            <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>
              MFA và API key được quản lý bởi Keycloak/backend. Email/phone: <b>field-encrypted</b> qua Vault Transit
            </div>
          </div>
          <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => setActiveSection('security')}>Xem chi tiết →</button>
        </div>

        {/* KPI cards */}
        <div className="merchant-kpi-grid">
          {stats.map(s => (
            <div key={s.label} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>{s.label}</span>
                <div style={{
                  width: 32, height: 32, borderRadius: 6, background: 'var(--primary-tint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={s.icon} size={14} color="var(--primary)" />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{
                fontSize: 11, marginTop: 4,
                color: s.positive ? 'var(--success)' : 'var(--warn)',
              }}>
                {s.delta} so với hôm qua
              </div>
            </div>
          ))}
        </div>

        {/* Chart + recent orders */}
        <div className="merchant-chart-grid">
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Doanh thu 7 ngày qua</h3>
            </div>
            {chartData.every(b => b.realAmount === 0) ? (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-400)', fontSize: 12 }}>
                Chưa có doanh thu từ backend.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180, padding: '0 4px', overflowX: 'auto' }}>
                {chartData.map((b) => (
                  <div key={b.d} style={{ flex: 1, minWidth: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-600)', fontWeight: 600 }}>
                      {b.realAmount.toLocaleString('vi-VN')}
                    </div>
                    <div style={{
                      width: '100%', maxWidth: 40, height: `${Math.max(b.v * 1.4, 4)}px`,
                      background: 'var(--primary-soft)',
                      borderRadius: '4px 4px 0 0',
                    }} />
                    <div style={{ fontSize: 11, color: 'var(--ink-600)' }}>{b.d}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Cần xử lý ngay</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { n: pendingCount, l: 'Đơn chờ xác nhận', c: 'var(--warn)',    i: 'package',  section: 'orders'   },
                { n: confirmedCount,  l: 'Đơn cần đóng gói', c: 'var(--primary)', i: 'gift',     section: 'orders'   },
              ].filter(t => t.n > 0).map(t => (
                <div key={t.l} onClick={() => setActiveSection(t.section)} style={{
                  padding: '10px 12px', borderRadius: 6, background: 'var(--ink-100)',
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 6, background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: t.c, fontWeight: 700, fontSize: 13,
                  }}>{t.n}</div>
                  <div style={{ flex: 1, fontSize: 12 }}>{t.l}</div>
                  <Icon name="chevron-right" size={12} color="var(--ink-400)" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product table */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Sản phẩm từ catalog</h3>
            <button style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}
              onClick={() => setActiveSection('products')}>Xem tất cả →</button>
          </div>
          <div className="table-responsive">
            <div className="table-min-width">
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 2.5fr 1fr 1fr 1fr 0.8fr 1fr',
                gap: 12, alignItems: 'center', padding: '8px 12px',
                background: 'var(--ink-100)', borderRadius: 6, fontSize: 11,
                color: 'var(--ink-600)', fontWeight: 600,
              }}>
                <span></span>
                <span>Sản phẩm</span>
                <span>SKU</span>
                <span>Giá</span>
                <span>Đã bán</span>
                <span style={{ textAlign: 'center' }}>Tồn</span>
                <span style={{ textAlign: 'center' }}>Trạng thái</span>
              </div>
              {products.map(p => (
                <div key={p.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 2.5fr 1fr 1fr 1fr 0.8fr 1fr',
                  gap: 12, alignItems: 'center', padding: '12px',
                  borderBottom: '1px solid var(--ink-100)', fontSize: 13,
                }}>
                  <div className="ph-img" style={{ width: 44, height: 44, borderRadius: 4, fontSize: 9 }}>{p.brand}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 500, lineHeight: 1.35,
                      display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{p.brand}</div>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-600)' }}>{p.sku}</span>
                  <span style={{ fontWeight: 600, color: 'var(--price)' }}>{window.formatVND(p.base_price)}</span>
                  <span>{typeof p.sold === 'number' ? p.sold.toLocaleString('vi-VN') : '—'}</span>
                  <span style={{ textAlign: 'center' }}>{typeof p.stock === 'number' ? p.stock : '—'}</span>
                  <div style={{ textAlign: 'center' }}>
                    {p.is_active === false
                      ? <span className="badge" style={{ fontSize: 10, background: 'var(--ink-100)', color: 'var(--ink-500)' }}>Ẩn</span>
                      : <span className="badge badge-success" style={{ fontSize: 10 }}>Active</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        </>}
      </div>
    </div>
  );
};

// ─── Register Screen: Keycloak registration redirect ───────────────
const RegisterScreen = ({ onLogin, onNav }) => {
  React.useEffect(() => {
    if (window.UitAuth) window.UitAuth.register();
  }, []);

  return (
    <div className="login-container">
      <div className="login-grid">
        <div className="login-visual">
          <div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: 16, marginBottom: 24 }}>UIT</div>
            <h2 style={{ fontSize: 26, lineHeight: 1.25, margin: '0 0 12px' }}>Đang chuyển sang Keycloak</h2>
            <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6, maxWidth: 340 }}>
              Form đăng ký custom được chuyển sang Keycloak theme để Keycloak xử lý password policy, MFA và SSO.
            </div>
          </div>
        </div>
        <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Đăng ký tài khoản</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.6, marginBottom: 18 }}>
            Mật khẩu và chính sách tài khoản do Keycloak đảm nhận, SPA không nhận hay chuyển tiếp mật khẩu.
          </div>
          <button onClick={() => window.UitAuth && window.UitAuth.register()} className="btn btn-primary" style={{ width: '100%', padding: 12 }}>
            Tiếp tục đăng ký
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Account Screen ──────────────────────────────────────────────────
const AccountScreen = ({ user, onNav, onLogout }) => {
  if (!user) { onNav('login'); return null; }

  const roles = (user.roles || []).filter(r => !['default-roles-nt219','offline_access','uma_authorization'].includes(r));
  const isAdmin = roles.includes('admin');

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 16px' }}>
      {/* Profile card */}
      <div className="card" style={{ padding: 28, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, flexShrink: 0,
          }}>{user.initial}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 2 }}>{user.email}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {roles.length > 0
                ? roles.map(r => (
                    <span key={r} className="badge badge-primary" style={{ fontSize: 11 }}>{r}</span>
                  ))
                : <span className="badge" style={{ fontSize: 11, background: 'var(--ink-100)', color: 'var(--ink-600)' }}>user</span>
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => onNav('orders')} className="btn btn-outline"
            style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
            <Icon name="package" size={18} /> Đơn hàng của tôi
          </button>

          <button onClick={() => onNav('merchant')} className="btn btn-outline"
            style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
            <Icon name="dashboard" size={18} /> Kênh người bán
          </button>

          <button onClick={() => { if (window.UitAuth) window.location.href = window.UitAuth.issuer + '/account'; }}
            className="btn btn-outline"
            style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
            <Icon name="lock" size={18} /> Đổi mật khẩu / Bảo mật
          </button>

          <button onClick={onLogout}
            style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start', color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: 6, background: 'white' }}>
            <Icon name="arrow-left" size={18} /> Đăng xuất
          </button>
        </div>
      </div>

      {/* JWT info — educational */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="key" size={14} color="var(--primary)" /> Phiên đăng nhập JWT
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-600)', lineHeight: 1.8 }}>
          <div>sub: {user.id || '—'}</div>
          <div>iss: {(window.UitAuth && window.UitAuth.issuer) || '—'}</div>
          <div>exp: access_token TTL = 300s · refresh rotation ✓</div>
          <div>alg: RS256 (Keycloak)</div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { LoginScreen, RegisterScreen, AccountScreen, MerchantScreen });
