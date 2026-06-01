// UIT Store — Home & Product Detail screens

// ─── Home Screen ─────────────────────────────────────────────────────
const HomeScreen = ({
  onProduct,
  onNav,
  apiStatus,
  productsVersion,
  searchQuery,
  activeCategory,
  onCategory
}) => {
  const [sortMode, setSortMode] = React.useState('all');
  const catalogLoading = !apiStatus || apiStatus.catalog === 'unknown' || apiStatus.catalog === 'loading';
  const catalogOk = apiStatus && apiStatus.catalog === 'ok';
  const catalogErr = apiStatus && apiStatus.catalog === 'error';
  const allProducts = React.useMemo(() => {
    let products = catalogOk ? window.PRODUCTS || [] : [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q));
    }
    if (activeCategory) {
      products = products.filter(p => p.category === activeCategory);
    }
    if (sortMode === 'newest') products = [...products].sort((a, b) => b.id.localeCompare(a.id));
    if (sortMode === 'bestseller') products = [...products].sort((a, b) => b.sold - a.sold);
    if (sortMode === 'rating') products = [...products].sort((a, b) => b.rating - a.rating);
    return products;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogOk, searchQuery, activeCategory, sortMode, productsVersion]);
  return /*#__PURE__*/React.createElement("div", {
    className: "shop-container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: '12px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 10px 8px',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--ink-700)'
    }
  }, "Danh m\u1EE5c"), window.CATEGORIES.map(cat => /*#__PURE__*/React.createElement("div", {
    key: cat.id,
    onClick: () => onCategory && onCategory(activeCategory === cat.id ? null : cat.id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: 13,
      transition: 'background 0.1s',
      background: activeCategory === cat.id ? 'var(--primary-tint)' : 'transparent',
      color: activeCategory === cat.id ? 'var(--primary)' : 'var(--ink-700)',
      fontWeight: activeCategory === cat.id ? 600 : 400,
      borderLeft: activeCategory === cat.id ? '3px solid var(--primary)' : '3px solid transparent'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: cat.icon,
    size: 16,
    color: activeCategory === cat.id ? 'var(--primary)' : 'var(--ink-400)'
  }), /*#__PURE__*/React.createElement("span", null, cat.name))))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 200,
      borderRadius: 10,
      overflow: 'hidden',
      background: 'linear-gradient(115deg, #1063C2 0%, #0A4B97 50%, #082F66 100%)',
      position: 'relative',
      color: 'white',
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 4,
      background: 'rgba(255, 215, 0, 0.2)',
      color: '#FFD600',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.05em',
      marginBottom: 12
    }
  }, "UIT STORE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 38,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: '-0.02em'
    }
  }, "Ch\xE0o m\u1EEBng \u0111\u1EBFn", /*#__PURE__*/React.createElement("br", null), "UIT Store")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      background: '#FFD600',
      color: '#082F66',
      fontWeight: 600
    },
    onClick: () => {
      const first = allProducts[0];
      if (first) onProduct(first.id);
    },
    disabled: allProducts.length === 0
  }, "Kh\xE1m ph\xE1 ngay ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -40,
      top: -40,
      width: 200,
      height: 200,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.05)'
    }
  })), (catalogLoading || catalogOk || catalogErr) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 14px',
      background: catalogOk ? '#f0faf3' : catalogLoading ? '#eff6ff' : '#fff7ed',
      border: '1px solid ' + (catalogOk ? '#bde5ca' : catalogLoading ? '#bfdbfe' : '#fed7aa'),
      borderRadius: 6,
      fontSize: 11,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: catalogOk ? 'check-circle' : catalogLoading ? 'box' : 'bell',
    size: 13,
    color: catalogOk ? 'var(--success)' : catalogLoading ? 'var(--primary)' : 'var(--warn)'
  }), catalogOk && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success)'
    }
  }, /*#__PURE__*/React.createElement("b", null, "Catalog Service"), " k\u1EBFt n\u1ED1i th\xE0nh c\xF4ng \xB7 ", window.UitAPI.backendUrl, " \xB7 ", allProducts.length, " s\u1EA3n ph\u1EA9m"), catalogLoading && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--primary)'
    }
  }, /*#__PURE__*/React.createElement("b", null, "Catalog Service"), " \u0111ang t\u1EA3i s\u1EA3n ph\u1EA9m"), catalogErr && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#a56700'
    }
  }, /*#__PURE__*/React.createElement("b", null, "Catalog Service"), " ch\u01B0a tr\u1EA3 d\u1EEF li\u1EC7u \u2014 ", window.UitAPI && window.UitAPI.lastCatalogError ? window.UitAPI.lastCatalogError : 'kiểm tra catalog-service trên NODE-2 và curl ' + (window.UitAPI && window.UitAPI.endpoints ? window.UitAPI.endpoints.CATALOG : '/api/v1/catalog') + '/public/products')), /*#__PURE__*/React.createElement("div", {
    className: "section-head"
  }, /*#__PURE__*/React.createElement("h2", null, searchQuery ? `Kết quả cho "${searchQuery}" (${allProducts.length})` : activeCategory ? `${(window.CATEGORIES || []).find(c => c.id === activeCategory)?.name || activeCategory} (${allProducts.length})` : 'Sản phẩm từ catalog'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, (searchQuery || activeCategory) && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSortMode('all');
      onCategory && onCategory(null);
    },
    style: {
      padding: '4px 10px',
      borderRadius: 12,
      fontSize: 11,
      background: '#FEE2E2',
      color: '#B91C1C',
      border: '1px solid #FCA5A5'
    }
  }, "\u2715 Xo\xE1 b\u1ED9 l\u1ECDc"), [{
    key: 'all',
    label: 'Tất cả'
  }, {
    key: 'newest',
    label: 'Mới nhất'
  }, {
    key: 'bestseller',
    label: 'Bán chạy'
  }, {
    key: 'rating',
    label: 'Đánh giá cao'
  }].map(({
    key,
    label
  }) => /*#__PURE__*/React.createElement("button", {
    key: key,
    onClick: () => setSortMode(key),
    style: {
      padding: '6px 14px',
      borderRadius: 20,
      fontSize: 12,
      background: sortMode === key ? 'var(--primary)' : 'white',
      color: sortMode === key ? 'white' : 'var(--ink-700)',
      border: sortMode === key ? 'none' : '1px solid var(--ink-200)'
    }
  }, label)))), allProducts.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '48px 24px',
      textAlign: 'center',
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 40,
    color: "var(--ink-300)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontSize: 15
    }
  }, catalogLoading ? 'Đang đợi Catalog Service trả sản phẩm' : catalogErr ? 'Catalog Service chưa trả dữ liệu sản phẩm' : 'Không tìm thấy sản phẩm phù hợp'), catalogOk && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSortMode('all');
      onCategory && onCategory(null);
    },
    className: "btn btn-outline",
    style: {
      marginTop: 16,
      padding: '8px 20px'
    }
  }, "Xem t\u1EA5t c\u1EA3 s\u1EA3n ph\u1EA9m")) : /*#__PURE__*/React.createElement("div", {
    className: "product-grid"
  }, allProducts.map(p => /*#__PURE__*/React.createElement(ProductCard, {
    key: p.id,
    product: p,
    onClick: () => onProduct(p.id)
  })))));
};

// ─── Product Detail Screen ───────────────────────────────────────────
const ProductScreen = ({
  productId,
  onAddToCart,
  onNav,
  onBuyNow,
  wishlist,
  onToggleWishlist
}) => {
  const products = window.PRODUCTS || [];
  const product = products.find(p => p.id === productId) || products[0];
  const [qty, setQty] = React.useState(1);
  const [selectedColor, setSelectedColor] = React.useState(0);
  const [activeThumb, setActiveThumb] = React.useState(0);
  if (!product) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--ink-500)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "box",
      size: 44,
      color: "var(--ink-300)"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink-700)'
      }
    }, "Ch\u01B0a c\xF3 s\u1EA3n ph\u1EA9m t\u1EEB Catalog Service"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        fontSize: 13
      }
    }, "Trang n\xE0y ch\u1EC9 hi\u1EC3n th\u1ECB s\u1EA3n ph\u1EA9m \u0111\u01B0\u1EE3c tr\u1EA3 v\u1EC1 t\u1EEB catalog."), /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav('home'),
      className: "btn btn-outline",
      style: {
        marginTop: 16,
        padding: '8px 20px'
      }
    }, "V\u1EC1 trang ch\u1EE7"));
  }
  const merchant = {
    name: product.merchant_name || product.brand || 'Nhà bán hàng UIT Store',
    is_verified: false,
    followers: '0',
    rating: 'N/A',
    since: 'N/A'
  };
  const isWishlisted = wishlist && wishlist.includes(product.id);
  const handleShare = () => {
    const url = window.location.origin + '/?product=' + product.id;
    if (navigator.share) {
      navigator.share({
        title: product.name,
        url
      });
    } else {
      navigator.clipboard && navigator.clipboard.writeText(url);
      console.info('Copied product URL:', url);
    }
  };
  const phColors = ['#FFE5D9', '#D9E8FF', '#E5F4DD', '#FFEACD', '#F0E2FF', '#FFE0E0', '#D9F4F0', '#FCE7F3', '#FFF4D9', '#E0F2FE', '#FEE2E2', '#DCFCE7'];
  const phColor = phColors[parseInt(product.id.split('_')[1]) % phColors.length];
  const related = products.filter(p => p.id !== product.id).slice(0, 5);
  const galleryImages = (product.images || []).map(img => typeof img === 'string' ? img : img && (img.url || img.src)).filter(Boolean);
  const mainImg = galleryImages[activeThumb] || galleryImages[0] || null;
  const weightLabel = product.weight_g >= 1000 ? `${(product.weight_g / 1000).toFixed(1)} kg` : `${product.weight_g} g`;
  const specRows = [['SKU', product.sku], ['Thương hiệu', product.brand], ...(product.warranty_months > 0 ? [['Bảo hành', `${product.warranty_months} tháng chính hãng`]] : []), ['Trọng lượng', weightLabel], ['Tồn kho', `${product.stock} sản phẩm`], ['Mã sản phẩm', product.id], ...Object.entries(product.specs || {})];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: 'pointer'
    },
    onClick: () => onNav('home')
  }, "Trang ch\u1EE7"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 11
  }), /*#__PURE__*/React.createElement("span", null, window.CATEGORIES.find(c => c.id === product.category)?.name || 'Sản phẩm'), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 11
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-700)'
    }
  }, product.name)), /*#__PURE__*/React.createElement("div", {
    className: "product-detail-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: 380,
      borderRadius: 6,
      background: phColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, mainImg ? /*#__PURE__*/React.createElement("img", {
    src: mainImg,
    alt: product.name,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      background: '#fff'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      color: 'var(--ink-500)',
      padding: '6px 12px',
      border: '1px dashed var(--ink-400)',
      borderRadius: 4,
      background: 'rgba(255,255,255,0.6)'
    }
  }, product.brand, " \xB7 ", product.sku), galleryImages.length > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      padding: '4px 10px',
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      fontSize: 11,
      borderRadius: 4
    }
  }, activeThumb + 1, " / ", galleryImages.length)), galleryImages.length > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 12
    }
  }, galleryImages.map((url, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => setActiveThumb(i),
    style: {
      width: 56,
      height: 56,
      borderRadius: 4,
      background: phColor,
      overflow: 'hidden',
      opacity: i === activeThumb ? 1 : 0.45,
      cursor: 'pointer',
      border: i === activeThumb ? '2px solid var(--primary)' : '1px solid var(--ink-200)',
      transition: 'opacity 0.15s, border-color 0.15s'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: url,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 14,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onToggleWishlist && onToggleWishlist(product.id),
    style: {
      flex: 1,
      padding: '8px',
      border: '1px solid var(--ink-200)',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      color: isWishlisted ? '#E11D48' : 'var(--ink-700)',
      background: isWishlisted ? '#FFF1F2' : 'white',
      borderColor: isWishlisted ? '#FDA4AF' : 'var(--ink-200)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 14,
    color: isWishlisted ? '#E11D48' : 'currentColor'
  }), isWishlisted ? 'Đã yêu thích' : 'Yêu thích'), /*#__PURE__*/React.createElement("button", {
    onClick: handleShare,
    style: {
      flex: 1,
      padding: '8px',
      border: '1px solid var(--ink-200)',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      color: 'var(--ink-700)'
    }
  }, "Chia s\u1EBB"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20
    }
  }, product.official && /*#__PURE__*/React.createElement("span", {
    className: "badge badge-primary",
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 11
  }), " H\xE0ng ch\xEDnh h\xE3ng \xB7 UIT Mall"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      margin: '6px 0 10px',
      lineHeight: 1.3
    }
  }, product.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      marginBottom: 16,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Stars, {
    rating: product.rating,
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-300)'
    }
  }, "|"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, product.rating_count.toLocaleString(), " \u0111\xE1nh gi\xE1"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-300)'
    }
  }, "|"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, "\u0110\xE3 b\xE1n ", product.sold.toLocaleString())), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      background: 'var(--ink-100)',
      borderRadius: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--price)',
      fontSize: 32,
      fontWeight: 700
    }
  }, window.formatVND(product.base_price)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)'
    }
  }, "/ s\u1EA3n ph\u1EA9m")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 12,
      color: 'var(--ink-600)'
    }
  }, "C\xF2n ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: product.stock <= 20 ? 'var(--warn)' : 'var(--ink-900)'
    }
  }, product.stock), " s\u1EA3n ph\u1EA9m trong kho")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, product.color_options && product.color_options.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90,
      color: 'var(--ink-500)',
      fontSize: 13,
      paddingTop: 6
    }
  }, "M\xE0u s\u1EAFc"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, product.color_options.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setSelectedColor(i),
    style: {
      padding: '6px 12px',
      fontSize: 12,
      border: selectedColor === i ? '2px solid var(--primary)' : '1px solid var(--ink-200)',
      borderRadius: 4,
      color: selectedColor === i ? 'var(--primary)' : 'var(--ink-700)',
      background: selectedColor === i ? 'var(--primary-tint)' : 'white'
    }
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90,
      color: 'var(--ink-500)',
      fontSize: 13,
      paddingTop: 6
    }
  }, "S\u1ED1 l\u01B0\u1EE3ng"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      border: '1px solid var(--ink-200)',
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(Math.max(1, qty - 1)),
    style: {
      padding: '6px 10px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minus",
    size: 12
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '0 16px',
      minWidth: 40,
      textAlign: 'center',
      borderLeft: '1px solid var(--ink-200)',
      borderRight: '1px solid var(--ink-200)'
    }
  }, qty), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(Math.min(product.stock, qty + 1)),
    style: {
      padding: '6px 10px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onAddToCart(product, qty),
    className: "btn",
    style: {
      flex: 1,
      background: 'var(--price-soft)',
      color: 'var(--price)',
      border: '1px solid var(--price)',
      padding: '12px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cart",
    size: 16
  }), " Th\xEAm v\xE0o gi\u1ECF"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onBuyNow(product, qty),
    className: "btn btn-price",
    style: {
      flex: 1,
      padding: '12px',
      fontSize: 15
    }
  }, "Mua ngay"))), /*#__PURE__*/React.createElement("div", {
    className: "product-merchant-card",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-500)',
      marginBottom: 10
    }
  }, "B\xE1n b\u1EDFi"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 6,
      background: 'var(--primary-tint)',
      border: '1px solid var(--primary-soft)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--primary)',
      fontWeight: 700,
      fontSize: 16
    }
  }, merchant.name.substring(0, 2).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, merchant.name.length > 18 ? merchant.name.substring(0, 18) + '…' : merchant.name, merchant.is_verified && /*#__PURE__*/React.createElement(Icon, {
    name: "check-circle",
    size: 12,
    color: "var(--primary)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-500)'
    }
  }, merchant.followers, " ng\u01B0\u1EDDi theo d\xF5i"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      marginTop: 12,
      fontSize: 11,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 6,
      background: 'var(--ink-100)',
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-500)'
    }
  }, "\u0110\xE1nh gi\xE1"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: 'var(--primary)'
    }
  }, merchant.rating, "/5")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 6,
      background: 'var(--ink-100)',
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-500)'
    }
  }, "Tham gia"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: 'var(--primary)'
    }
  }, merchant.since))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      width: '100%',
      marginTop: 12,
      padding: '6px',
      fontSize: 12
    },
    onClick: () => onNav('merchant')
  }, "Xem shop")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 10
    }
  }, "V\u1EADn chuy\u1EC3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, "Giao \u0111\u1EBFn"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, "Th\u1EE7 \u0110\u1EE9c, TP. HCM")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, "Ph\xED giao h\xE0ng"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success)',
      fontWeight: 600
    }
  }, "Mi\u1EC5n ph\xED")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-600)'
    }
  }, "Nh\u1EADn h\xE0ng"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, function () {
    var d = new Date();
    var added = 0;
    while (added < 3) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()] + ', ' + d.getDate() + '/' + (d.getMonth() + 1);
  }()))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 8,
      background: 'var(--warn-soft)',
      borderRadius: 4,
      fontSize: 11,
      color: '#A56700',
      display: 'flex',
      gap: 6,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gift",
    size: 14
  }), "\u0110\u1ED5i tr\u1EA3 mi\u1EC5n ph\xED trong 7 ng\xE0y")))), /*#__PURE__*/React.createElement("div", {
    className: "product-specs-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      margin: '0 0 12px'
    }
  }, "M\xF4 t\u1EA3 s\u1EA3n ph\u1EA9m"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-700)',
      lineHeight: 1.7,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("p", null, product.description), product.warranty_months > 0 && /*#__PURE__*/React.createElement("p", null, "S\u1EA3n ph\u1EA9m \u0111i k\xE8m b\u1EA3o h\xE0nh ch\xEDnh h\xE3ng ", /*#__PURE__*/React.createElement("b", null, product.warranty_months, " th\xE1ng"), ", h\u1ED9p ni\xEAm phong v\xE0 \u0111\u1EA7y \u0111\u1EE7 ph\u1EE5 ki\u1EC7n theo ti\xEAu chu\u1EA9n nh\xE0 s\u1EA3n xu\u1EA5t."))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      margin: '0 0 12px'
    }
  }, "Th\xF4ng s\u1ED1 chi ti\u1EBFt"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13
    }
  }, specRows.map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      padding: '7px 0',
      borderBottom: '1px dashed var(--ink-200)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 140,
      flexShrink: 0,
      color: 'var(--ink-500)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: k === 'SKU' || k === 'Mã sản phẩm' ? 'JetBrains Mono, monospace' : 'inherit'
    }
  }, v)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-head"
  }, /*#__PURE__*/React.createElement("h2", null, "S\u1EA3n ph\u1EA9m t\u01B0\u01A1ng t\u1EF1")), /*#__PURE__*/React.createElement("div", {
    className: "product-grid"
  }, related.map(p => /*#__PURE__*/React.createElement(ProductCard, {
    key: p.id,
    product: p,
    onClick: () => onNav('product', p.id)
  })))));
};
Object.assign(window, {
  HomeScreen,
  ProductScreen
});
