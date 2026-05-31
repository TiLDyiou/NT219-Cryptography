// UIT Store — Cart, Checkout, Order tracking

// ─── Cart Screen ─────────────────────────────────────────────────────
const CartScreen = ({ cart, setCart, onNav, user }) => {
  const resolveProduct = (c) => (
    window.UitAPI && window.UitAPI.productFromCartLine
      ? window.UitAPI.productFromCartLine(c)
      : window.PRODUCTS.find(p => p.id === c.productId)
  );

  const items = cart.map(c => ({
    ...c,
    product: resolveProduct(c),
  })).filter(i => i.product);

  const [selected, setSelected] = React.useState(() => items.map(i => i.productId));

  // Sync selected when items list changes
  React.useEffect(() => {
    setSelected(prev => {
      const ids = items.map(i => i.productId);
      // keep existing selected that are still in cart, add new ones as selected
      const kept = prev.filter(id => ids.includes(id));
      const added = ids.filter(id => !prev.includes(id));
      return [...kept, ...added];
    });
  }, [cart.length]);

  const toggleSelect = (productId) => {
    setSelected(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleAll = () => {
    const allIds = items.map(i => i.productId);
    setSelected(selected.length === allIds.length ? [] : allIds);
  };

  const byMerchant = {};
  items.forEach(i => {
    const mid = i.product.merchant_id;
    if (!byMerchant[mid]) byMerchant[mid] = [];
    byMerchant[mid].push(i);
  });

  const selectedItems = items.filter(i => selected.includes(i.productId));
  const subtotal = selectedItems.reduce((s, i) => s + i.product.base_price * i.qty, 0);
  const ship     = subtotal > 500000 ? 0 : (subtotal > 0 ? 25000 : 0);
  const total    = subtotal + ship;

  const updateQty = (productId, delta) => {
    setCart(cart.map(c => c.productId === productId
      ? { ...c, qty: Math.max(1, c.qty + delta) }
      : c
    ));
  };

  const removeItem = (productId) => {
    setCart(cart.filter(c => c.productId !== productId));
  };

  if (items.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%', background: 'var(--ink-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Icon name="cart" size={48} color="var(--ink-400)" />
        </div>
        <h2 style={{ margin: '0 0 8px' }}>Giỏ hàng đang trống</h2>
        <p style={{ color: 'var(--ink-600)', marginBottom: 24 }}>Hãy thêm sản phẩm để bắt đầu mua sắm nhé!</p>
        <button onClick={() => onNav('home')} className="btn btn-primary">Tiếp tục mua sắm</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 16px' }}>
        Giỏ hàng <span style={{ color: 'var(--ink-500)', fontWeight: 400, fontSize: 16 }}>({items.length} sản phẩm)</span>
      </h1>

      <div className="cart-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TrustStrip />

          {/* Header row */}
          <div className="card hide-mobile" style={{
            padding: '12px 16px', display: 'grid',
            gridTemplateColumns: '40px 1fr 100px 130px 100px 40px',
            gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--ink-500)', fontWeight: 500,
          }}>
            <input type="checkbox"
              checked={selected.length === items.length && items.length > 0}
              onChange={toggleAll} />
            <span>Sản phẩm ({selected.length}/{items.length} đã chọn)</span>
            <span style={{ textAlign: 'center' }}>Đơn giá</span>
            <span style={{ textAlign: 'center' }}>Số lượng</span>
            <span style={{ textAlign: 'right' }}>Thành tiền</span>
            <span></span>
          </div>

          {Object.entries(byMerchant).map(([mid, mitems]) => {
            const firstItem = mitems && mitems.length > 0 ? mitems[0] : null;
            const merchant = {
              name: firstItem && firstItem.product && firstItem.product.merchant_name 
                      ? firstItem.product.merchant_name 
                      : (mid || 'Nhà bán hàng UIT Store'),
            };
            return (
              <div key={mid} className="card" style={{ overflow: 'hidden' }}>
                <div style={{
                  padding: '10px 16px', background: 'var(--ink-100)',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                  borderBottom: '1px solid var(--ink-200)',
                }}>
                  <input type="checkbox"
                    checked={mitems.every(it => selected.includes(it.productId))}
                    onChange={() => {
                      const mids = mitems.map(it => it.productId);
                      const allSel = mids.every(id => selected.includes(id));
                      setSelected(prev => allSel
                        ? prev.filter(id => !mids.includes(id))
                        : [...new Set([...prev, ...mids])]
                      );
                    }} />
                  <Icon name="shield-check" size={14} color="var(--primary)" />
                  <span style={{ fontWeight: 600 }}>{merchant.name}</span>
                  <button style={{ color: 'var(--primary)', fontSize: 12, marginLeft: 8 }}
                    onClick={() => onNav('merchant')}>Xem shop →</button>
                </div>

                {/* Desktop items */}
                <div className="hide-mobile">
                  {mitems.map(item => (
                    <div key={item.productId} style={{
                      padding: '16px', display: 'grid',
                      gridTemplateColumns: '40px 1fr 100px 130px 100px 40px',
                      gap: 12, alignItems: 'center', borderBottom: '1px solid var(--ink-100)',
                    }}>
                      <input type="checkbox"
                        checked={selected.includes(item.productId)}
                        onChange={() => toggleSelect(item.productId)} />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div className="ph-img" style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 4, overflow: 'hidden' }}>
                          {item.product.images && item.product.images.length > 0 && item.product.images[0].url ? (
                            <img src={window.UitAPI && window.UitAPI.resolveMediaUrl ? window.UitAPI.resolveMediaUrl(item.product.images[0].url) : item.product.images[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : item.product.brand}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 500, lineHeight: 1.4, marginBottom: 6,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>{item.product.name}</div>
                          {item.product.color_options && item.product.color_options.length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                              Phân loại: {item.product.color_options[0]}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--price)', fontWeight: 700 }}>{window.formatVND(item.product.base_price)}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--ink-200)', borderRadius: 4 }}>
                          <button onClick={() => updateQty(item.productId, -1)} style={{ padding: '4px 8px' }}><Icon name="minus" size={11}/></button>
                          <span style={{ padding: '0 12px', minWidth: 36, textAlign: 'center', borderLeft: '1px solid var(--ink-200)', borderRight: '1px solid var(--ink-200)', fontSize: 13 }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.productId, 1)} style={{ padding: '4px 8px' }}><Icon name="plus" size={11}/></button>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', color: 'var(--price)', fontWeight: 700 }}>
                        {window.formatVND(item.product.base_price * item.qty)}
                      </div>
                      <button onClick={() => removeItem(item.productId)} style={{ color: 'var(--ink-400)', padding: 6 }}>
                        <Icon name="x" size={16}/>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Mobile items */}
                <div className="show-mobile">
                  {mitems.map(item => (
                    <div key={item.productId} className="cart-item-mobile">
                      <input type="checkbox"
                        checked={selected.includes(item.productId)}
                        onChange={() => toggleSelect(item.productId)}
                        style={{ marginTop: 4 }} />
                      <div className="ph-img" style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 4, fontSize: 10, overflow: 'hidden' }}>
                        {item.product.images && item.product.images.length > 0 && item.product.images[0].url ? (
                            <img src={window.UitAPI && window.UitAPI.resolveMediaUrl ? window.UitAPI.resolveMediaUrl(item.product.images[0].url) : item.product.images[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : item.product.brand}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500, lineHeight: 1.35, marginBottom: 4,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{item.product.name}</div>
                        {item.product.color_options && item.product.color_options.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 6 }}>
                            Phân loại: {item.product.color_options[0]}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ color: 'var(--price)', fontWeight: 700, fontSize: 14 }}>
                            {window.formatVND(item.product.base_price)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--ink-200)', borderRadius: 4, background: 'white' }}>
                            <button onClick={() => updateQty(item.productId, -1)} style={{ padding: '2px 8px' }}><Icon name="minus" size={10}/></button>
                            <span style={{ padding: '0 8px', minWidth: 24, textAlign: 'center', fontSize: 12 }}>{item.qty}</span>
                            <button onClick={() => updateQty(item.productId, 1)} style={{ padding: '2px 8px' }}><Icon name="plus" size={10}/></button>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.productId)} style={{ color: 'var(--ink-400)', padding: 4, marginLeft: 4 }}>
                        <Icon name="x" size={16}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 16, alignSelf: 'start' }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--ink-100)' }}>
              Giao tới
            </div>
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{user ? user.name : 'Khách'}</div>
              <div style={{ color: 'var(--ink-600)', marginTop: 4 }}>
                Nhập địa chỉ nhận hàng ở bước thanh toán.
              </div>
              <button onClick={() => onNav('checkout', selected)} style={{ marginTop: 8, color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>Nhập địa chỉ</button>
            </div>
            <div style={{
              marginTop: 12, padding: 8, background: 'var(--success-soft)',
              borderRadius: 4, fontSize: 11, color: 'var(--ink-700)',
              display: 'flex', gap: 6, alignItems: 'start',
            }}>
              <Icon name="lock" size={12} color="var(--success)" />
              <span>Địa chỉ được <b>mã hoá field-level</b> trong DB qua Vault Transit</span>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-600)' }}>Tạm tính</span>
                <span>{window.formatVND(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-600)' }}>Phí vận chuyển</span>
                <span style={{ color: ship === 0 ? 'var(--success)' : undefined }}>
                  {ship === 0 ? 'Miễn phí' : window.formatVND(ship)}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--ink-200)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600 }}>Tổng tiền</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--price)', fontSize: 22, fontWeight: 700 }}>{window.formatVND(total)}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>Đã bao gồm VAT (nếu có)</div>
                </div>
              </div>
            </div>
            {user ? (
              <button onClick={() => onNav('checkout', selected)} className="btn btn-price"
                disabled={selected.length === 0}
                style={{ width: '100%', marginTop: 14, padding: '12px', fontSize: 14, opacity: selected.length === 0 ? 0.5 : 1 }}>
                Mua hàng ({selected.length})
              </button>
            ) : (
              <div style={{ marginTop: 14 }}>
                <button onClick={() => onNav('login')} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14 }}>
                  Đăng nhập để thanh toán
                </button>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-500)', textAlign: 'center' }}>
                  Chưa có tài khoản?{' '}
                  <a style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => window.UitAuth && window.UitAuth.register()}>Đăng ký ngay</a>
                </div>
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-500)', textAlign: 'center' }}>
              Bấm "Mua hàng" đồng nghĩa bạn đồng ý với <a style={{ color: 'var(--primary)' }}>Điều khoản UIT Store</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Checkout Screen ─────────────────────────────────────────────────
const CheckoutScreen = ({ cart, onNav, onPay, user }) => {
  const [payment, setPayment]   = React.useState('cod');
  const [delivery, setDelivery] = React.useState('fast');
  const [address, setAddress] = React.useState({
    full_name: user ? (user.name || '') : '',
    phone: '',
    email: user ? (user.email || '') : '',
    address_line1: '',
    city: '',
    state_province: '',
    postal_code: '',
  });

  // Tính ngày giao dự kiến động
  function addBizDays(date, n) {
    var d = new Date(date); var added = 0;
    while (added < n) { d.setDate(d.getDate()+1); if(d.getDay()!==0&&d.getDay()!==6) added++; }
    return d;
  }
  const DAY_NAMES = ['CN','T2','T3','T4','T5','T6','T7'];
  const fmtDate = d => DAY_NAMES[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth()+1);
  const resolveProduct = (c) => (
    window.UitAPI && window.UitAPI.productFromCartLine
      ? window.UitAPI.productFromCartLine(c)
      : window.PRODUCTS.find(p => p.id === c.productId)
  );
  const items = cart.map(c => ({
    ...c, product: resolveProduct(c),
  })).filter(i => i.product);

  const subtotal = items.reduce((s, i) => s + i.product.base_price * i.qty, 0);
  const deliveryFee = delivery === 'instant' ? 35000 : 0;
  const ship     = deliveryFee;
  const total    = subtotal + ship;

  const paymentOptions = [
    { id: 'credit_card',   label: 'Thẻ tín dụng / ghi nợ',        desc: 'Chuyển sang Stripe Checkout để thanh toán', icon: 'credit-card' },
    { id: 'cod',      label: 'Thanh toán khi nhận hàng (COD)', desc: 'Gửi phương thức thanh toán sang Order Service', icon: 'truck' },
  ];

  if (items.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <Icon name="cart" size={44} color="var(--ink-300)" />
        <h2 style={{ margin: '12px 0 8px' }}>Không có sản phẩm hợp lệ để thanh toán</h2>
        <p style={{ color: 'var(--ink-600)', marginBottom: 24 }}>Giỏ hàng cần được đồng bộ với Cart Service và Catalog Service.</p>
        <button onClick={() => onNav('cart')} className="btn btn-primary">Quay lại giỏ hàng</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Stepper */}
      <div className="card" style={{ padding: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        {[
          { num: 1, label: 'Giỏ hàng',                   done: true },
          { num: 2, label: 'Thông tin & Thanh toán',      active: true },
          { num: 3, label: 'Hoàn tất',                    pending: true },
        ].map((s, i, arr) => (
          <React.Fragment key={s.num}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: s.done ? 'var(--success)' : s.active ? 'var(--primary)' : 'var(--ink-200)',
                color: s.pending ? 'var(--ink-500)' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600,
              }}>
                {s.done ? <Icon name="check" size={14} color="white" /> : s.num}
              </div>
              <span className="stepper-label" style={{
                fontSize: 13, fontWeight: s.active ? 600 : 500,
                color: s.pending ? 'var(--ink-500)' : 'var(--ink-900)',
              }}>{s.label}</span>
            </div>
            {i < arr.length - 1 && (
              <div className="checkout-stepper-connector" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="checkout-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Address */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="pin" size={16} color="var(--primary)" /> Địa chỉ nhận hàng
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input className="input" placeholder="Họ tên người nhận *" value={address.full_name}
                onChange={e => setAddress({ ...address, full_name: e.target.value })} />
              <input className="input" placeholder="Số điện thoại *" value={address.phone}
                onChange={e => setAddress({ ...address, phone: e.target.value })} />
              <input className="input" placeholder="Email" value={address.email}
                onChange={e => setAddress({ ...address, email: e.target.value })} />
              <input className="input" placeholder="Tỉnh / thành phố *" value={address.city}
                onChange={e => setAddress({ ...address, city: e.target.value })} />
              <div style={{ gridColumn: '1 / -1' }}>
                <input className="input" placeholder="Địa chỉ cụ thể *" value={address.address_line1}
                  onChange={e => setAddress({ ...address, address_line1: e.target.value })} />
              </div>
              <input className="input" placeholder="Quận / huyện" value={address.state_province}
                onChange={e => setAddress({ ...address, state_province: e.target.value })} />
              <input className="input" placeholder="Mã bưu chính" value={address.postal_code}
                onChange={e => setAddress({ ...address, postal_code: e.target.value })} />
              <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="lock" size={11} color="var(--success)" />
                Thông tin giao hàng sẽ được gửi sang Order Service.
              </div>
            </div>
          </div>

          {/* Delivery method */}
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="truck" size={16} color="var(--primary)" /> Phương thức vận chuyển
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { id: 'fast',    label: 'Giao nhanh',    sub: 'Nhận hàng ' + fmtDate(addBizDays(new Date(), 1)), price: 0,     recommended: true },
                { id: 'express', label: 'Giao tiết kiệm',sub: 'Nhận hàng ' + fmtDate(addBizDays(new Date(), 3)) + ' – ' + fmtDate(addBizDays(new Date(), 4)), price: 0 },
                { id: 'instant', label: 'Giao trong 2h', sub: 'Áp dụng nội thành TP. HCM',       price: 35000 },
              ].map((d) => (
                <label key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  border: `1px solid ${delivery === d.id ? 'var(--primary)' : 'var(--ink-200)'}`,
                  borderRadius: 6, cursor: 'pointer',
                  background: delivery === d.id ? 'var(--primary-tint)' : 'white',
                  flexWrap: 'wrap',
                }}>
                  <input type="radio" name="delivery" checked={delivery === d.id} onChange={() => setDelivery(d.id)} />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {d.label}
                      {d.recommended && <span className="badge badge-success">Khuyên dùng</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>{d.sub}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: d.price === 0 ? 'var(--success)' : 'var(--ink-900)' }}>
                    {d.price === 0 ? 'Miễn phí' : window.formatVND(d.price)}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="credit-card" size={16} color="var(--primary)" /> Phương thức thanh toán
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paymentOptions.map(p => (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  border: `1px solid ${payment === p.id ? 'var(--primary)' : 'var(--ink-200)'}`,
                  borderRadius: 6, cursor: 'pointer',
                  background: payment === p.id ? 'var(--primary-tint)' : 'white',
                  flexWrap: 'wrap',
                }}>
                  <input type="radio" name="payment" checked={payment === p.id} onChange={() => setPayment(p.id)} />
                  <Icon name={p.icon} size={20} color="var(--primary)" />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 2 }}>{p.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {payment === 'credit_card' && (
              <div style={{ marginTop: 14, padding: 16, background: 'var(--ink-100)', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="lock" size={12} color="var(--success)" />
                  <span>Bạn sẽ được chuyển sang Stripe Checkout. UIT Store không lưu thông tin thẻ.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 16, alignSelf: 'start' }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Đơn hàng ({items.length} sản phẩm)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflow: 'auto' }}>
              {items.map(i => (
                <div key={i.productId} style={{ display: 'flex', gap: 10 }}>
                  <div className="ph-img" style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 4, fontSize: 9, overflow: 'hidden' }}>
                    {i.product.images && i.product.images.length > 0 && i.product.images[0].url ? (
                        <img src={window.UitAPI && window.UitAPI.resolveMediaUrl ? window.UitAPI.resolveMediaUrl(i.product.images[0].url) : i.product.images[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : i.product.brand}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                    <div style={{
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', lineHeight: 1.3,
                    }}>{i.product.name}</div>
                    <div style={{ color: 'var(--ink-500)', marginTop: 2 }}>x{i.qty}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--price)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {window.formatVND(i.product.base_price * i.qty)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-600)' }}>Tạm tính</span>
                <span>{window.formatVND(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-600)' }}>Phí vận chuyển</span>
                <span style={{ color: ship === 0 ? 'var(--success)' : undefined }}>
                  {ship === 0 ? 'Miễn phí' : window.formatVND(ship)}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--ink-200)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600 }}>Tổng tiền</span>
                <div style={{ color: 'var(--price)', fontSize: 22, fontWeight: 700 }}>{window.formatVND(total)}</div>
              </div>
            </div>
            <button onClick={() => onPay(payment, deliveryFee, address)} className="btn btn-price" style={{ width: '100%', marginTop: 14, padding: '12px', fontSize: 14 }}>
              <Icon name="lock" size={14} color="white" /> Đặt hàng & Thanh toán
            </button>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-500)', textAlign: 'center', lineHeight: 1.5 }}>
              Bằng việc đặt hàng, bạn đồng ý với <a style={{ color: 'var(--primary)' }}>Điều khoản dịch vụ</a> của UIT Store.
              Yêu cầu sẽ được gửi sang Order Service.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Order Success / Tracking ────────────────────────────────────────
const OrderScreenContent = ({ orderTotal, orderId: realOrderId, orderPayload, user, onNav }) => {
  const [fetchedPayload, setFetchedPayload] = React.useState(orderPayload);
  const [loading, setLoading] = React.useState(!orderPayload);

  React.useEffect(function () {
    if (realOrderId && !orderPayload) {
      window.UitAPI.order.get(realOrderId)
        .then(function(res) {
          setFetchedPayload(res.data);
          setLoading(false);
        })
        .catch(function(err) {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [realOrderId, orderPayload]);

  if (!realOrderId) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <Icon name="package" size={44} color="var(--ink-300)" />
        <h2 style={{ margin: '12px 0 8px' }}>Chưa có đơn hàng</h2>
        <p style={{ color: 'var(--ink-600)', marginBottom: 24 }}>Bạn chưa chọn đơn hàng nào.</p>
        <button onClick={() => onNav('home')} className="btn btn-primary">Về trang chủ</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-400)' }}>
        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
        Đang tải thông tin đơn hàng...
      </div>
    );
  }

  if (!fetchedPayload) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ margin: '12px 0 8px' }}>Không tìm thấy đơn hàng</h2>
        <button onClick={() => onNav('orders')} className="btn btn-primary">Về danh sách đơn hàng</button>
      </div>
    );
  }

  const items   = fetchedPayload.items || [];
  const addr    = fetchedPayload.shipping_address || {};
  const pm      = fetchedPayload.payment_method_type || 'cod';
  const total   = orderTotal || fetchedPayload.total_amount || (
    items.reduce(function(s,i){ return s + i.unit_price * i.quantity; }, 0) + (fetchedPayload.shipping_fee || 0)
  ) || 0;
  let ts = new Date(fetchedPayload.created_at || new Date());
  if (isNaN(ts.getTime())) ts = new Date();
  const orderNumber = fetchedPayload.order_number || realOrderId;
  const isSuccessScreen = !!orderPayload; // If navigated from checkout

  // Tính ngày giao dự kiến: +3 ngày làm việc
  function addBusinessDays(date, days) {
    var d = new Date(date); var added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return d;
  }
  const deliveryDate = addBusinessDays(ts, 3);
  const fmtDate = function(d) {
    var days = ['CN','T2','T3','T4','T5','T6','T7'];
    return days[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth()+1);
  };

  const pmLabel = { credit_card: 'Thẻ tín dụng / ghi nợ', cod: 'Thanh toán khi nhận hàng', e_wallet: 'Ví điện tử' };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => onNav('orders')} style={{ color: 'var(--ink-500)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>
          <Icon name="arrow-left" size={14} /> Quay lại
        </button>
      </div>
      
      {/* Header success */}
      <div className="card" style={{
        padding: '32px 28px', textAlign: 'center', marginBottom: 16,
        background: isSuccessScreen ? 'linear-gradient(180deg, #E8F7EE 0%, white 60%)' : 'white',
      }}>
        {isSuccessScreen && (
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(22, 163, 74, 0.3)',
          }}>
            <Icon name="check" size={40} color="white" stroke={3} />
          </div>
        )}
        <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>
          {isSuccessScreen ? 'Đặt hàng thành công!' : 'Chi tiết đơn hàng'}
        </h1>
        {isSuccessScreen && (
          <p style={{ color: 'var(--ink-600)', margin: '0 0 18px' }}>
            Cảm ơn <b>{addr.full_name || 'bạn'}</b> đã mua sắm tại UIT Store.
          </p>
        )}
        <div style={{
          display: 'inline-flex', gap: 24, padding: '14px 24px', flexWrap: 'wrap', justifyContent: 'center',
          background: 'white', borderRadius: 8, border: '1px solid var(--ink-200)', fontSize: 13,
          marginTop: isSuccessScreen ? 0 : 16,
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--ink-500)', fontSize: 11 }}>Mã đơn hàng</div>
            <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>Đơn #{orderNumber}</div>
          </div>
          <div style={{ width: 1, background: 'var(--ink-200)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--ink-500)', fontSize: 11 }}>Tổng tiền</div>
            <div style={{ fontWeight: 700, color: 'var(--price)' }}>{window.formatVND(total)}</div>
          </div>
          <div style={{ width: 1, background: 'var(--ink-200)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--ink-500)', fontSize: 11 }}>Thanh toán</div>
            <div style={{ fontWeight: 700 }}>{pmLabel[pm] || pm}</div>
          </div>
          <div style={{ width: 1, background: 'var(--ink-200)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--ink-500)', fontSize: 11 }}>Dự kiến nhận</div>
            <div style={{ fontWeight: 700 }}>{fmtDate(deliveryDate)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Items */}
        {items.length > 0 && (
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>
              Sản phẩm đã đặt ({items.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(function(item, i) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 6, background: 'var(--primary-tint)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      fontSize: 11, fontWeight: 700, color: 'var(--primary)',
                    }}>{item.quantity}x</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{item.sku}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--price)', flexShrink: 0 }}>
                      {window.formatVND(item.unit_price * item.quantity)}
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid var(--ink-100)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--ink-500)' }}>Phí ship</span>
                <span>{orderPayload && orderPayload.shipping_fee === 0 ? 'Miễn phí' : window.formatVND(orderPayload && orderPayload.shipping_fee || 25000)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Shipping address */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Địa chỉ giao hàng</h3>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-700)' }}>
            <div style={{ fontWeight: 600 }}>{addr.full_name || '—'}</div>
            <div>{addr.phone || ''}</div>
            <div>{addr.email || ''}</div>
            <div style={{ color: 'var(--ink-500)', marginTop: 4, fontSize: 12 }}>
              {[addr.address_line1, addr.city, addr.state_province].filter(Boolean).join(', ')}
            </div>
          </div>
        </div>
      </div>

      {/* Tracking */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 600 }}>Tiến trình đơn hàng</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 2, background: 'var(--ink-200)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 16, left: 16, width: '12.5%', height: 2, background: 'var(--success)', zIndex: 0 }} />
          {[
            { label: 'Đã đặt hàng',   sub: ts.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'}).replace('Invalid Date', ''), done: true,  active: false },
            { label: 'Đã xác nhận',   sub: 'Trong 30 phút',    done: false, active: true  },
            { label: 'Đang đóng gói', sub: 'Trong 2-3h',        done: false, active: false },
            { label: 'Giao ĐVVC',     sub: 'Trước 18h hôm nay', done: false, active: false },
            { label: 'Đang giao',     sub: fmtDate(addBusinessDays(ts,2)), done: false, active: false },
            { label: 'Đã giao',       sub: fmtDate(deliveryDate), done: false, active: false },
          ].map(function(s, i) {
            return (
              <div key={i} style={{ position: 'relative', zIndex: 1, textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: s.done ? 'var(--success)' : s.active ? 'var(--primary)' : 'white',
                  border: '2px solid ' + (s.done ? 'var(--success)' : s.active ? 'var(--primary)' : 'var(--ink-300)'),
                  color: s.done || s.active ? 'white' : 'var(--ink-400)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                }}>
                  {s.done ? <Icon name="check" size={14} color="white" /> : i + 1}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: s.done || s.active ? 600 : 400, color: s.done || s.active ? 'var(--ink-900)' : 'var(--ink-500)' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>{s.sub}</div>
              </div>
            );
          })}
        </div>
      </div>



      <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
        <button onClick={() => onNav('home')} className="btn btn-outline" style={{ padding: '10px 24px' }}>
          Tiếp tục mua sắm
        </button>
        <button onClick={() => onNav('orders')} className="btn btn-primary" style={{ padding: '10px 24px' }}>
          Xem lịch sử đơn hàng
        </button>
      </div>
    </div>
  );
};

class OrderScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'red', background: '#fee' }}>
          <h2>React Runtime Error in OrderScreen</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.stack}</pre>
        </div>
      );
    }
    return <OrderScreenContent {...this.props} />;
  }
}

const OrderScreen = (props) => <OrderScreenErrorBoundary {...props} />;

// ─── Orders Screen ────────────────────────────────────────────────────
const OrdersScreen = ({ onNav, user }) => {
  const [orders, setOrders]   = React.useState(null); // null = loading
  const [error, setError]     = React.useState('');

  React.useEffect(function () {
    if (!user) { onNav('login'); return; }
    window.UitAPI.order.list()
      .then(function (res) {
        setOrders((res && res.data) || []);
      })
      .catch(function (err) {
        setOrders([]);
        setError('Lỗi kết nối tới Backend: ' + err.message);
      });
  }, []);

  const statusBadge = {
    pending:    { label: 'Chờ xác nhận', color: '#F59E0B', bg: '#FEF3C7' },
    confirmed:  { label: 'Đã xác nhận',  color: '#3B82F6', bg: '#EFF6FF' },
    shipped:    { label: 'Đang giao',     color: '#8B5CF6', bg: '#F5F3FF' },
    delivered:  { label: 'Đã giao',       color: '#10B981', bg: '#ECFDF5' },
    cancelled:  { label: 'Đã huỷ',        color: '#EF4444', bg: '#FEF2F2' },
  };

  return (
    <div style={{ maxWidth: 680, margin: '32px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => onNav('account')} style={{ color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <Icon name="arrow-left" size={14} /> Tài khoản
        </button>
        <span style={{ color: 'var(--ink-300)' }}>/</span>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Đơn hàng của tôi</span>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, fontSize: 12, color: '#92400E', marginBottom: 14 }}>
          {error}
        </div>
      )}

      {orders === null && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-400)' }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          Đang tải đơn hàng...
        </div>
      )}

      {orders && orders.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--ink-500)' }}>
          <Icon name="package" size={40} color="var(--ink-300)" />
          <div style={{ marginTop: 12, fontSize: 15 }}>Bạn chưa có đơn hàng nào</div>
          <button onClick={() => onNav('home')} className="btn btn-primary" style={{ marginTop: 16, padding: '10px 24px' }}>
            Bắt đầu mua sắm
          </button>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(function (o) {
            var badge = statusBadge[o.status] || statusBadge.pending;
            var date  = new Date(o.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return (
              <div key={o.id} className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                onClick={() => onNav('order', o.id)}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8, background: 'var(--primary-tint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name="package" size={22} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, fontFamily: 'monospace' }}>Đơn hàng #{o.order_number}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                    {date} · {o.item_count || '?'} sản phẩm
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--price)', fontSize: 14 }}>
                    {window.formatVND(o.total_amount)}
                  </div>
                  <div style={{ marginTop: 4, padding: '2px 8px', borderRadius: 10, display: 'inline-block', fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { CartScreen, CheckoutScreen, OrderScreen, OrdersScreen });
