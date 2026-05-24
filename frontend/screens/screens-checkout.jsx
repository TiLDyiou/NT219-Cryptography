// UIT Store — Cart, Checkout (with 3DS), Order tracking

// ─── Cart Screen ─────────────────────────────────────────────────────
const CartScreen = ({ cart, setCart, onNav }) => {
  const items = cart.map(c => ({
    ...c,
    product: window.PRODUCTS.find(p => p.id === c.productId),
  })).filter(i => i.product);

  const byMerchant = {};
  items.forEach(i => {
    const mid = i.product.merchant_id;
    if (!byMerchant[mid]) byMerchant[mid] = [];
    byMerchant[mid].push(i);
  });

  const subtotal = items.reduce((s, i) => s + i.product.base_price * i.qty, 0);
  const ship     = subtotal > 500000 ? 0 : 25000;
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
            <input type="checkbox" defaultChecked />
            <span>Sản phẩm</span>
            <span style={{ textAlign: 'center' }}>Đơn giá</span>
            <span style={{ textAlign: 'center' }}>Số lượng</span>
            <span style={{ textAlign: 'right' }}>Thành tiền</span>
            <span></span>
          </div>

          {Object.entries(byMerchant).map(([mid, mitems]) => {
            const merchant = window.MERCHANTS[mid];
            return (
              <div key={mid} className="card" style={{ overflow: 'hidden' }}>
                <div style={{
                  padding: '10px 16px', background: 'var(--ink-100)',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                  borderBottom: '1px solid var(--ink-200)',
                }}>
                  <input type="checkbox" defaultChecked />
                  <Icon name="shield-check" size={14} color="var(--primary)" />
                  <span style={{ fontWeight: 600 }}>{merchant.name}</span>
                  <button style={{ color: 'var(--primary)', fontSize: 12, marginLeft: 8 }}>Xem shop →</button>
                </div>

                {/* Desktop items */}
                <div className="hide-mobile">
                  {mitems.map(item => (
                    <div key={item.productId} style={{
                      padding: '16px', display: 'grid',
                      gridTemplateColumns: '40px 1fr 100px 130px 100px 40px',
                      gap: 12, alignItems: 'center', borderBottom: '1px solid var(--ink-100)',
                    }}>
                      <input type="checkbox" defaultChecked />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div className="ph-img" style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 4 }}>
                          {item.product.brand}
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
                      <input type="checkbox" defaultChecked style={{ marginTop: 4 }} />
                      <div className="ph-img" style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 4, fontSize: 10 }}>
                        {item.product.brand}
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
              <div style={{ fontWeight: 600 }}>Nguyễn Văn An <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>| 0912 ••• 789</span></div>
              <div style={{ color: 'var(--ink-600)', marginTop: 4 }}>
                Số 1 Hàn Thuyên, Phường Linh Trung,<br/>TP. Thủ Đức, TP. Hồ Chí Minh
              </div>
              <button style={{ marginTop: 8, color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>Thay đổi →</button>
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
            <button onClick={() => onNav('checkout')} className="btn btn-price" style={{ width: '100%', marginTop: 14, padding: '12px', fontSize: 14 }}>
              Mua hàng ({items.length})
            </button>
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
const CheckoutScreen = ({ cart, onNav, onPay }) => {
  const [payment, setPayment] = React.useState('credit');
  const items = cart.map(c => ({
    ...c, product: window.PRODUCTS.find(p => p.id === c.productId),
  })).filter(i => i.product);

  const subtotal = items.reduce((s, i) => s + i.product.base_price * i.qty, 0);
  const ship     = subtotal > 500000 ? 0 : 25000;
  const total    = subtotal + ship;

  const paymentOptions = [
    { id: 'credit',   label: 'Thẻ tín dụng / ghi nợ',               desc: 'Visa, Mastercard, JCB · Hỗ trợ 3-D Secure 2.0',        icon: 'credit-card', secure: '3DS · PSP Tokenization' },
    { id: 'momo',     label: 'Ví MoMo',                               desc: 'Thanh toán qua ví điện tử MoMo',                        icon: 'wallet',      secure: 'OAuth2 · Signed callback' },
    { id: 'vnpay',    label: 'VNPay QR',                              desc: 'Quét mã QR ngân hàng trong nước',                       icon: 'qr',          secure: 'HMAC-SHA512 signed' },
    { id: 'transfer', label: 'Chuyển khoản ngân hàng',                desc: 'Chuyển khoản trực tiếp, xác nhận trong 5 phút',         icon: 'wallet',      secure: 'Verified via banking API' },
    { id: 'cod',      label: 'Thanh toán khi nhận hàng (COD)',        desc: 'Chỉ áp dụng đơn dưới 5.000.000đ',                      icon: 'truck',       secure: 'OTP xác nhận khi giao' },
  ];

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Stepper */}
      <div className="card" style={{ padding: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        {[
          { num: 1, label: 'Giỏ hàng',                   done: true },
          { num: 2, label: 'Thông tin & Thanh toán',      active: true },
          { num: 3, label: 'Xác thực 3-D Secure',         pending: true },
          { num: 4, label: 'Hoàn tất',                    pending: true },
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
              <button style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 500 }}>Thay đổi</button>
            </div>
            <div style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--primary-tint)', borderRadius: 6, border: '1px solid var(--primary-soft)', flexWrap: 'wrap' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)', fontWeight: 700,
              }}>NA</div>
              <div style={{ flex: 1, minWidth: 200, fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>
                  Nguyễn Văn An <span style={{ color: 'var(--ink-500)', fontWeight: 400, marginLeft: 8 }}>0912 ••• 789</span>
                  <span className="badge badge-primary" style={{ marginLeft: 8 }}>Mặc định</span>
                </div>
                <div style={{ color: 'var(--ink-700)', marginTop: 4 }}>
                  Số 1 Hàn Thuyên, Khu phố 6, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-500)', display: 'flex', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="lock" size={11} color="var(--success)" />
                    Số điện thoại đã được mask · giải mã chỉ khi giao hàng
                  </span>
                </div>
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
                { id: 'fast',    label: 'Giao nhanh',    sub: 'Nhận hàng Thứ 2, 26/5 (sau 24h)', price: 0,     recommended: true },
                { id: 'express', label: 'Giao tiết kiệm',sub: 'Nhận hàng 3-4 ngày tới',          price: 0 },
                { id: 'instant', label: 'Giao trong 2h', sub: 'Áp dụng nội thành TP. HCM',       price: 35000 },
              ].map((d, i) => (
                <label key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  border: `1px solid ${i === 0 ? 'var(--primary)' : 'var(--ink-200)'}`,
                  borderRadius: 6, cursor: 'pointer',
                  background: i === 0 ? 'var(--primary-tint)' : 'white',
                  flexWrap: 'wrap',
                }}>
                  <input type="radio" name="delivery" defaultChecked={i === 0} />
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
                  <span className="badge badge-success" style={{ fontSize: 10 }}>
                    <Icon name="shield-check" size={10} /> {p.secure}
                  </span>
                </label>
              ))}
            </div>

            {payment === 'credit' && (
              <div style={{ marginTop: 14, padding: 16, background: 'var(--ink-100)', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="lock" size={12} color="var(--success)" />
                  <span>Thông tin thẻ được mã hoá <b>client-side</b> bởi PSP SDK và <b>không gửi qua UIT Store backend</b>. UIT Store chỉ nhận token thay vì PAN.</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 4, display: 'block' }}>Số thẻ</label>
                    <div style={{ position: 'relative' }}>
                      <input className="input" placeholder="•••• •••• •••• ••••" defaultValue="4242 4242 4242 4242" />
                      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                        <div style={{ padding: '2px 6px', background: 'white', border: '1px solid var(--ink-200)', borderRadius: 3, fontSize: 10, fontWeight: 700, color: 'var(--primary)' }}>VISA</div>
                      </div>
                    </div>
                  </div>
                  <div className="checkout-card-inputs">
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 4, display: 'block' }}>Tên chủ thẻ</label>
                      <input className="input" placeholder="NGUYEN VAN AN" defaultValue="NGUYEN VAN AN" />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 4, display: 'block' }}>Hết hạn</label>
                      <input className="input" placeholder="MM/YY" defaultValue="12/27" />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 4, display: 'block' }}>CVV</label>
                      <input className="input" placeholder="•••" defaultValue="•••" type="password"/>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 4 }}>
                    <input type="checkbox" />
                    Lưu thẻ này cho lần sau (token sẽ được lưu, không phải số thẻ)
                  </label>
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
                  <div className="ph-img" style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 4, fontSize: 9 }}>
                    {i.product.brand}
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
            <button onClick={() => onPay(payment)} className="btn btn-price" style={{ width: '100%', marginTop: 14, padding: '12px', fontSize: 14 }}>
              <Icon name="lock" size={14} color="white" /> Đặt hàng & Thanh toán
            </button>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-500)', textAlign: 'center', lineHeight: 1.5 }}>
              Bằng việc đặt hàng, bạn đồng ý với <a style={{ color: 'var(--primary)' }}>Điều khoản dịch vụ</a> của UIT Store.
              Yêu cầu sẽ được ký bằng <b>HMAC-SHA256</b> trước khi gửi tới Payment Service.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 3DS Modal ───────────────────────────────────────────────────────
const ThreeDSModal = ({ amount, onComplete, onCancel }) => {
  const [step, setStep]     = React.useState('connecting');
  const [otp, setOtp]       = React.useState(['', '', '', '', '', '']);
  const [seconds, setSeconds] = React.useState(120);

  React.useEffect(() => {
    if (step === 'connecting') {
      const t = setTimeout(() => setStep('otp'), 1600);
      return () => clearTimeout(t);
    }
  }, [step]);

  React.useEffect(() => {
    if (step === 'otp' && seconds > 0) {
      const t = setTimeout(() => setSeconds(s => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [step, seconds]);

  const setDigit = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v;
    setOtp(next);
    if (v && i < 5) { const el = document.getElementById(`otp-${i+1}`); if (el) el.focus(); }
  };

  const verify = () => {
    setStep('verifying');
    setTimeout(() => { setStep('success'); setTimeout(onComplete, 1100); }, 1500);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ width: 460, maxWidth: 'calc(100% - 24px)', background: 'white', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', background: 'linear-gradient(90deg, #00204A, #003876)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00204A', fontWeight: 800, fontSize: 12 }}>VCB</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Vietcombank · 3-D Secure 2.0</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Xác thực giao dịch trực tuyến</div>
            </div>
          </div>
          <Icon name="lock" size={20} color="white" />
        </div>

        <div style={{
          padding: '8px 20px', background: '#F4F6FB', fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-600)',
          borderBottom: '1px solid var(--ink-200)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="lock" size={11} color="var(--success)" />
          <span style={{ color: 'var(--success)' }}>https://</span>
          <span><b>3dsecure.vietcombank.com.vn</b>/auth/challenge</span>
        </div>

        <div style={{ padding: 24, minHeight: 320 }}>
          {step === 'connecting' && (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 18px', borderWidth: 3 }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Đang kết nối với ngân hàng phát hành...</div>
              <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>UIT Store đang gửi token thanh toán đã ký HMAC tới PSP (Stripe sandbox)</div>
              <div style={{
                marginTop: 24, padding: 12, background: 'var(--ink-100)', borderRadius: 6,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: 'var(--ink-600)', textAlign: 'left', lineHeight: 1.6,
              }}>
                <div style={{ color: 'var(--success)' }}>✓ TLS handshake — TLS 1.3, X25519</div>
                <div style={{ color: 'var(--success)' }}>✓ Tokenize PAN → tok_1Ngk2H9c...</div>
                <div style={{ color: 'var(--success)' }}>✓ Sign req → HMAC-SHA256</div>
                <div>· Initiate 3DS challenge...</div>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Xác thực giao dịch</div>
              <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 18, lineHeight: 1.6 }}>
                Mã OTP gồm 6 chữ số đã được gửi đến số điện thoại <b>0912 ••• 789</b> đăng ký với thẻ Visa kết thúc bằng <b>4242</b>.
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--ink-100)', borderRadius: 6, fontSize: 12, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-600)' }}>Đơn vị thụ hưởng</span>
                  <b>UIT Store Vietnam</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-600)' }}>Số tiền</span>
                  <b style={{ color: 'var(--price)' }}>{window.formatVND(amount)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-600)' }}>Mã giao dịch</span>
                  <b style={{ fontFamily: 'monospace', fontSize: 11 }}>TXN-2026052401-A7F3</b>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
                {otp.map((d, i) => (
                  <input key={i} id={`otp-${i}`} value={d} onChange={e => setDigit(i, e.target.value)}
                    maxLength="1" inputMode="numeric"
                    style={{
                      width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 600,
                      border: '1.5px solid var(--ink-200)', borderRadius: 6, outline: 'none',
                      background: d ? 'var(--primary-tint)' : 'white',
                      borderColor: d ? 'var(--primary)' : 'var(--ink-200)',
                    }} />
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-600)', marginBottom: 18 }}>
                Mã có hiệu lực trong <b style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {Math.floor(seconds/60)}:{String(seconds % 60).padStart(2, '0')}
                </b> · <a style={{ color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer' }}>Gửi lại</a>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onCancel} className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--ink-200)' }}>Huỷ</button>
                <button onClick={verify} className="btn btn-primary" style={{ flex: 2 }} disabled={otp.some(d => !d)}>
                  Xác nhận thanh toán
                </button>
              </div>
            </div>
          )}

          {step === 'verifying' && (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 18px', borderWidth: 3 }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Đang xác minh OTP...</div>
              <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>Vui lòng không đóng cửa sổ</div>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Icon name="check" size={36} color="var(--success)" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Thanh toán thành công!</div>
              <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>Đang chuyển hướng về UIT Store...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Order Success / Tracking ────────────────────────────────────────
const OrderScreen = ({ orderTotal, onNav }) => {
  const orderId = 'UIT-2026052401-A7F3';
  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="card" style={{
        padding: '32px 28px', textAlign: 'center', marginBottom: 16,
        background: 'linear-gradient(180deg, #E8F7EE 0%, white 60%)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: 'var(--success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(22, 163, 74, 0.3)',
        }}>
          <Icon name="check" size={40} color="white" stroke={3} />
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>Đặt hàng thành công!</h1>
        <p style={{ color: 'var(--ink-600)', margin: '0 0 18px' }}>
          Cảm ơn bạn đã mua sắm tại UIT Store. Đơn hàng đã được xác nhận và sẽ sớm được giao đến.
        </p>
        <div style={{
          display: 'inline-flex', gap: 24, padding: '14px 24px',
          background: 'white', borderRadius: 8, border: '1px solid var(--ink-200)', fontSize: 13,
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--ink-500)', fontSize: 11 }}>Mã đơn hàng</div>
            <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>{orderId}</div>
          </div>
          <div style={{ width: 1, background: 'var(--ink-200)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--ink-500)', fontSize: 11 }}>Tổng tiền</div>
            <div style={{ fontWeight: 700, color: 'var(--price)' }}>{window.formatVND(orderTotal || 32480000)}</div>
          </div>
          <div style={{ width: 1, background: 'var(--ink-200)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--ink-500)', fontSize: 11 }}>Dự kiến nhận</div>
            <div style={{ fontWeight: 700 }}>Thứ 2, 26/5</div>
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
            { label: 'Đã đặt hàng',  sub: 'Vừa xong',            done: true, active: true },
            { label: 'Đã xác nhận',  sub: 'Trong 30 phút',        done: false },
            { label: 'Đang đóng gói',sub: 'Trong 2-3h',           done: false },
            { label: 'Giao cho ĐVVC',sub: 'Trước 18h hôm nay',   done: false },
            { label: 'Đang giao',    sub: 'CN 25/5',              done: false },
            { label: 'Đã giao',      sub: 'T2 26/5',              done: false },
          ].map((s, i) => (
            <div key={i} style={{ position: 'relative', zIndex: 1, textAlign: 'center', flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: s.done ? 'var(--success)' : s.active ? 'var(--primary)' : 'white',
                border: `2px solid ${s.done ? 'var(--success)' : s.active ? 'var(--primary)' : 'var(--ink-300)'}`,
                color: s.done || s.active ? 'white' : 'var(--ink-400)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600,
              }}>
                {s.done ? <Icon name="check" size={14} color="white" /> : i + 1}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: s.done || s.active ? 600 : 400, color: s.done || s.active ? 'var(--ink-900)' : 'var(--ink-500)' }}>{s.label}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Crypto audit log */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="shield-check" size={16} color="var(--primary)" /> Nhật ký bảo mật giao dịch
        </h3>
        <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 14 }}>
          Tất cả bước trong giao dịch đều được ký số và ghi vào audit log không thể chỉnh sửa (append-only).
        </div>
        <div style={{
          padding: 14, background: '#0F172A', borderRadius: 6,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#E2E8F0', lineHeight: 1.7,
        }}>
          <div><span style={{ color: '#94A3B8' }}>[14:32:01.234]</span> <span style={{ color: '#4ADE80' }}>POST</span> /api/v1/checkout → Gateway · sig=hmac-sha256(✓)</div>
          <div><span style={{ color: '#94A3B8' }}>[14:32:01.341]</span> <span style={{ color: '#4ADE80' }}>POST</span> order-service.create() · mTLS=✓ · cert=spiffe://order</div>
          <div><span style={{ color: '#94A3B8' }}>[14:32:01.587]</span> <span style={{ color: '#4ADE80' }}>POST</span> payment-service.tokenize() → PSP · tok_1Ngk2H9c•••</div>
          <div><span style={{ color: '#94A3B8' }}>[14:32:02.103]</span> <span style={{ color: '#FCD34D' }}>3DS</span> challenge.required · ACS=vietcombank.com.vn</div>
          <div><span style={{ color: '#94A3B8' }}>[14:32:18.402]</span> <span style={{ color: '#4ADE80' }}>3DS</span> challenge.completed · CAVV=✓ · ECI=05</div>
          <div><span style={{ color: '#94A3B8' }}>[14:32:18.745]</span> <span style={{ color: '#4ADE80' }}>PAY</span> capture.success · amount={window.formatVND(orderTotal || 32480000)}</div>
          <div><span style={{ color: '#94A3B8' }}>[14:32:18.812]</span> <span style={{ color: '#4ADE80' }}>EVT</span> kafka.publish(order.paid) · sig=ed25519</div>
          <div><span style={{ color: '#94A3B8' }}>[14:32:19.001]</span> <span style={{ color: '#4ADE80' }}>SVC</span> inventory.reserve() · mTLS=✓ · idempotency-key=ok</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
        <button onClick={() => onNav('home')} className="btn btn-outline" style={{ padding: '10px 24px' }}>
          Tiếp tục mua sắm
        </button>
        <button className="btn btn-primary" style={{ padding: '10px 24px' }}>
          Xem chi tiết đơn hàng
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { CartScreen, CheckoutScreen, ThreeDSModal, OrderScreen });
