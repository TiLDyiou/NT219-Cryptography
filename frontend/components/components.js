function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// MMH Shopping — Shared components (Icon, Header, Footer, ProductCard, etc.)

// ─── Icons ───────────────────────────────────────────────────────────
const Icon = ({
  name,
  size = 18,
  color = 'currentColor',
  stroke = 1.8
}) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };
  switch (name) {
    case 'search':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "11",
        cy: "11",
        r: "7"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m20 20-3.5-3.5"
      }));
    case 'cart':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: "20",
        r: "1.5"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "18",
        cy: "20",
        r: "1.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M2 3h3l3 13h12l2-8H6"
      }));
    case 'user':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "8",
        r: "4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"
      }));
    case 'home':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M3 11 12 3l9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z"
      }));
    case 'phone':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "6",
        y: "2",
        width: "12",
        height: "20",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M11 18h2"
      }));
    case 'laptop':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "5",
        width: "18",
        height: "11",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M2 20h20"
      }));
    case 'shirt':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3-2 2h-4z"
      }));
    case 'dress':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M9 3v3l-5 13h16l-5-13V3M9 3h6M9 6h6"
      }));
    case 'beauty':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M9 2h6v4H9z"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "6",
        y: "6",
        width: "12",
        height: "16",
        rx: "2"
      }));
    case 'book':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M4 4h7a4 4 0 0 1 4 4v13M20 4h-2a4 4 0 0 0-3 1.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M4 4v17h7"
      }));
    case 'toy':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "10",
        r: "6"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: "9",
        r: "1"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "15",
        cy: "9",
        r: "1"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 13c1 1 4 1 6 0M8 16l-2 5M16 16l2 5"
      }));
    case 'sport':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "9"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M12 3v18M3 12h18"
      }));
    case 'food':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M4 9h16l-2 11H6L4 9zM7 9V6a5 5 0 0 1 10 0v3"
      }));
    case 'shield':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"
      }));
    case 'shield-check':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m9 12 2 2 4-4"
      }));
    case 'lock':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "5",
        y: "11",
        width: "14",
        height: "10",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M8 11V7a4 4 0 0 1 8 0v4"
      }));
    case 'key':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "8",
        cy: "15",
        r: "4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m11 12 9-9M16 7l3 3"
      }));
    case 'check':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "m5 12 5 5L20 7"
      }));
    case 'check-circle':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "10"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m8 12 3 3 5-6"
      }));
    case 'plus':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M12 5v14M5 12h14"
      }));
    case 'minus':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M5 12h14"
      }));
    case 'x':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M6 6l12 12M18 6 6 18"
      }));
    case 'arrow-right':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M5 12h14M13 5l7 7-7 7"
      }));
    case 'arrow-left':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M19 12H5M11 5l-7 7 7 7"
      }));
    case 'chevron-right':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "m9 5 7 7-7 7"
      }));
    case 'chevron-down':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "m6 9 6 6 6-6"
      }));
    case 'star':
      return /*#__PURE__*/React.createElement("svg", _extends({}, props, {
        fill: color
      }), /*#__PURE__*/React.createElement("path", {
        d: "m12 2 3 7 7 .5-5.5 5L18 22l-6-3.5L6 22l1.5-7.5L2 9.5 9 9z"
      }));
    case 'star-outline':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "m12 2 3 7 7 .5-5.5 5L18 22l-6-3.5L6 22l1.5-7.5L2 9.5 9 9z"
      }));
    case 'truck':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M1 8h13v9H1zM14 11h5l3 3v3h-8"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "6",
        cy: "19",
        r: "2"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "18",
        cy: "19",
        r: "2"
      }));
    case 'bell':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M6 19V11a6 6 0 1 1 12 0v8M3 19h18M10 22h4"
      }));
    case 'heart':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M12 21s-7-4.5-9-9c-1.5-3.5 1.5-7 5-7 2 0 3 1 4 2 1-1 2-2 4-2 3.5 0 6.5 3.5 5 7-2 4.5-9 9-9 9z"
      }));
    case 'tag':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "m20 12-8 8-9-9V3h8z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "7",
        cy: "7",
        r: "1.5",
        fill: color
      }));
    case 'gift':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "8",
        width: "18",
        height: "13",
        rx: "1"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 12h18M12 8v13M8 8a3 3 0 1 1 0-6c2 0 4 6 4 6M16 8a3 3 0 1 0 0-6c-2 0-4 6-4 6"
      }));
    case 'package':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"
      }));
    case 'credit-card':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "2",
        y: "5",
        width: "20",
        height: "14",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M2 10h20M6 15h4"
      }));
    case 'pin':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "10",
        r: "2.5"
      }));
    case 'fingerprint':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M6 11a6 6 0 0 1 12 0v3M9 14c0 3 1 5 2 7M15 11v3c0 2 .5 4 1.5 6M12 11v6M5 16c.5 1.5 1 3 2 5"
      }));
    case 'eye':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "3"
      }));
    case 'globe':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "9"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"
      }));
    case 'qr':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "3",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "3",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "14",
        width: "7",
        height: "7"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M14 14h3v3M21 14v3M14 21h7M21 17v4"
      }));
    case 'menu':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M3 6h18M3 12h18M3 18h18"
      }));
    case 'mic':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "9",
        y: "3",
        width: "6",
        height: "12",
        rx: "3"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M5 11a7 7 0 0 0 14 0M12 18v3"
      }));
    case 'camera':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M3 7h4l2-3h6l2 3h4v13H3z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "13",
        r: "4"
      }));
    case 'wallet':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "6",
        width: "18",
        height: "14",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 10h18M17 15h2"
      }));
    case 'dashboard':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "3",
        width: "8",
        height: "10"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "13",
        y: "3",
        width: "8",
        height: "6"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "13",
        y: "11",
        width: "8",
        height: "10"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "15",
        width: "8",
        height: "6"
      }));
    case 'box':
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m3.3 7 8.7 5 8.7-5M12 22V12"
      }));
    default:
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "9"
      }));
  }
};

// ─── Placeholder Image ───────────────────────────────────────────────
const PhImg = ({
  label,
  height = 180,
  bg,
  children
}) => /*#__PURE__*/React.createElement("div", {
  className: "ph-img",
  style: {
    width: '100%',
    height,
    borderRadius: 6,
    background: bg || undefined
  }
}, children || `[ ${label || 'image'} ]`);

// ─── Star Rating ─────────────────────────────────────────────────────
const Stars = ({
  rating,
  size = 12,
  showNum = true
}) => {
  const full = Math.floor(rating);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2
    }
  }, [0, 1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement(Icon, {
    key: i,
    name: i < full ? 'star' : 'star-outline',
    size: size,
    color: "#FFB400"
  })), showNum && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 4,
      fontSize: size - 1,
      color: 'var(--ink-600)'
    }
  }, rating.toFixed(1)));
};

// ─── Trust strip ─────────────────────────────────────────────────────
const TrustStrip = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    padding: '8px 14px',
    background: 'var(--success-soft)',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--ink-700)',
    border: '1px solid #BDE5CA'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "shield-check",
  size: 14,
  color: "var(--success)"
}), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "mTLS"), " \xB7 B\u1EA3o m\u1EADt \u0111\u1EA7u cu\u1ED1i")), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 1,
    height: 14,
    background: '#BDE5CA'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  }
}, /*#__PURE__*/React.createElement(Icon, {
  name: "lock",
  size: 14,
  color: "var(--success)"
}), /*#__PURE__*/React.createElement("span", null, "Thanh to\xE1n ", /*#__PURE__*/React.createElement("b", null, "3-D Secure"))), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 1,
    height: 14,
    background: '#BDE5CA'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  }
}, /*#__PURE__*/React.createElement("span", {
  className: "secure-dot"
}), /*#__PURE__*/React.createElement("span", null, "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111ang \u0111\u01B0\u1EE3c m\xE3 ho\xE1")));

// ─── Header ──────────────────────────────────────────────────────────
// catId có thể là string (1 category) hoặc array (nhiều category)
const NAV_CATEGORIES = [{
  label: 'Điện tử & Công nghệ',
  catId: ['phone', 'laptop']
}, {
  label: 'Thời trang',
  catId: ['fashion', 'fashion-w']
}, {
  label: 'Nhà cửa & Đời sống',
  catId: ['home']
}, {
  label: 'Sách & Giáo dục',
  catId: ['book']
}, {
  label: 'Thể thao & Sức khỏe',
  catId: ['sport']
}];
const Header = ({
  nav,
  cartCount,
  onNav,
  user,
  onLogout,
  onSearch,
  onCategory,
  onToast
}) => {
  const [q, setQ] = React.useState('');
  const doSearch = () => {
    const term = q.trim();
    if (term) {
      onSearch && onSearch(term);
    }
  };
  const handleKeyDown = e => {
    if (e.key === 'Enter') doSearch();
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--primary)',
      color: 'white'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "header-top-bar",
    style: {
      borderBottom: '1px solid rgba(255,255,255,0.12)',
      padding: '6px 24px',
      fontSize: 12,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      opacity: 0.9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: 'pointer'
    },
    onClick: () => onNav('merchant')
  }, "K\xEAnh ng\u01B0\u1EDDi b\xE1n"), /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: 'pointer'
    },
    onClick: () => onToast && onToast('Tính năng tải ứng dụng — coming soon')
  }, "T\u1EA3i \u1EE9ng d\u1EE5ng"), /*#__PURE__*/React.createElement("span", null, "K\u1EBFt n\u1ED1i")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      alignItems: 'center',
      opacity: 0.9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      cursor: 'pointer'
    },
    onClick: () => onToast && onToast('Bạn chưa có thông báo mới')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 13
  }), " Th\xF4ng b\xE1o"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "globe",
    size: 13
  }), " Ti\u1EBFng Vi\u1EC7t"), user ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer'
    },
    onClick: () => onNav('account')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: '#FFB400',
      color: 'var(--primary-dark)',
      fontSize: 10,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, user.initial), user.name), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.4
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: 'pointer',
      opacity: 0.85
    },
    onClick: onLogout
  }, "\u0110\u0103ng xu\u1EA5t")) : /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: 'pointer'
    },
    onClick: () => onNav('login')
  }, "\u0110\u0103ng k\xFD \xB7 \u0110\u0103ng nh\u1EADp"))), /*#__PURE__*/React.createElement("div", {
    className: "header-main-bar"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => onNav('home'),
    style: {
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 8,
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: 2
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://upload.wikimedia.org/wikipedia/commons/3/32/Ho_Chi_Minh_City_University_of_Information_Technology_Full_Logo.JPG",
    alt: "UIT",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16
    }
  }, "UIT Store"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      opacity: 0.85
    }
  }, "T\u1ED1t & Nhanh \u2014 Mua s\u1EAFm an to\xE0n"))), /*#__PURE__*/React.createElement("div", {
    className: "header-search-container",
    style: {
      flex: 1,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'white',
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px 0 14px',
      height: 40
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18,
    color: "var(--ink-500)"
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    onKeyDown: handleKeyDown,
    placeholder: "B\u1EA1n t\xECm g\xEC h\xF4m nay?",
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      padding: '0 10px',
      background: 'transparent',
      color: 'var(--ink-900)',
      fontSize: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      paddingRight: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '6px 8px',
      color: 'var(--ink-500)'
    },
    onClick: () => onToast && onToast('Tìm kiếm bằng ảnh — coming soon')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "camera",
    size: 18
  })), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '6px 8px',
      color: 'var(--ink-500)'
    },
    onClick: () => onToast && onToast('Tìm kiếm bằng giọng nói — coming soon')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mic",
    size: 18
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      padding: '6px 16px',
      borderRadius: 4
    },
    onClick: doSearch
  }, "T\xECm ki\u1EBFm"))), /*#__PURE__*/React.createElement("div", {
    className: "header-suggestions",
    style: {
      display: 'flex',
      gap: 14,
      marginTop: 6,
      fontSize: 11,
      opacity: 0.9
    }
  }, ['iPhone 15', 'Tủ lạnh', 'Đắc nhân tâm', 'Nồi chiên không dầu', 'AirPods', 'Áo thun nam'].map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      cursor: 'pointer'
    },
    onClick: () => {
      setQ(t);
      onSearch && onSearch(t);
    }
  }, t)))), /*#__PURE__*/React.createElement("div", {
    onClick: () => onNav('cart'),
    style: {
      cursor: 'pointer',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 14px',
      borderRadius: 6,
      background: 'rgba(255,255,255,0.1)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cart",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, "Gi\u1ECF h\xE0ng"), cartCount > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -4,
      right: 4,
      background: '#FFB400',
      color: 'var(--primary-dark)',
      fontSize: 10,
      fontWeight: 700,
      padding: '1px 6px',
      borderRadius: 8
    }
  }, cartCount))), /*#__PURE__*/React.createElement("div", {
    className: "header-nav-strip"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 13
  }), /*#__PURE__*/React.createElement("span", null, "Giao \u0111\u1EBFn: ", /*#__PURE__*/React.createElement("b", null, "Q. Th\u1EE7 \u0110\u1EE9c, TP. HCM"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      gap: 16,
      justifyContent: 'center'
    }
  }, NAV_CATEGORIES.map(c => /*#__PURE__*/React.createElement("span", {
    key: c.catId,
    style: {
      cursor: 'pointer'
    },
    onClick: () => onCategory && onCategory(c.catId)
  }, c.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      opacity: 0.95
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "secure-dot"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "HTTPS \xB7 TLS 1.3")))));
};

// ─── Footer ──────────────────────────────────────────────────────────
const Footer = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'white',
    borderTop: '1px solid var(--ink-200)',
    padding: '32px 24px',
    marginTop: 32
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "footer-grid"
}, [{
  h: 'Hỗ trợ khách hàng',
  items: ['Trung tâm trợ giúp', 'UIT Store Care', 'Hướng dẫn đặt hàng', 'Chính sách đổi trả', 'Chính sách bảo mật']
}, {
  h: 'Về UIT Store',
  items: ['Giới thiệu', 'Tuyển dụng', 'Điều khoản sử dụng', 'Bán hàng cùng UIT Store', 'Liên hệ truyền thông']
}, {
  h: 'Hợp tác và liên kết',
  items: ['Quy chế hoạt động', 'Bán hàng đối tác', 'Affiliate', 'Đăng ký bán hàng', 'API & Developer Portal']
}, {
  h: 'Chứng nhận bởi',
  items: ['Bộ Công Thương', 'PCI-DSS Compliant', 'ISO 27001', 'OAuth2 · OIDC', 'mTLS Service Mesh']
}, {
  h: 'Phương thức thanh toán',
  items: ['Visa · Mastercard · JCB', 'Apple Pay · Google Pay', 'Momo · ZaloPay · VNPay', 'Chuyển khoản · COD', '3-D Secure 2.0 · Tokenization']
}].map(col => /*#__PURE__*/React.createElement("div", {
  key: col.h
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600,
    marginBottom: 10,
    fontSize: 13
  }
}, col.h), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    color: 'var(--ink-600)'
  }
}, col.items.map(i => /*#__PURE__*/React.createElement("span", {
  key: i
}, i)))))), /*#__PURE__*/React.createElement("div", {
  className: "footer-bottom"
}, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 UIT Store \u2014 \u0110\u1ED3 \xE1n m\xF4n NT219 Cryptography \xB7 UIT"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("span", {
  className: "badge badge-success"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "shield-check",
  size: 11
}), " mTLS \xB7 HMAC \xB7 3DS"), /*#__PURE__*/React.createElement("span", {
  className: "badge badge-primary"
}, /*#__PURE__*/React.createElement(Icon, {
  name: "key",
  size: 11
}), " Vault KMS \xB7 Envelope encryption"))));

// ─── ProductCard ─────────────────────────────────────────────────────
const ProductCard = ({
  product,
  onClick,
  dense = false
}) => {
  const phColors = ['#FFE5D9', '#D9E8FF', '#E5F4DD', '#FFEACD', '#F0E2FF', '#FFE0E0', '#D9F4F0', '#FCE7F3', '#FFF4D9', '#E0F2FE', '#FEE2E2', '#DCFCE7'];
  const phColor = phColors[parseInt(product.id.split('_')[1]) % phColors.length];
  const imgUrl = window.UitAPI && window.UitAPI.productImageUrl ? window.UitAPI.productImageUrl(product) : product.images && product.images[0] && (product.images[0].url || product.images[0]) || null;
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    onClick: onClick,
    style: {
      cursor: 'pointer',
      overflow: 'hidden',
      position: 'relative',
      transition: 'all 0.15s',
      border: '1px solid var(--ink-200)'
    },
    onMouseEnter: e => e.currentTarget.style.boxShadow = 'var(--shadow-md)',
    onMouseLeave: e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: dense ? 160 : 180,
      background: phColor,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, imgUrl && /*#__PURE__*/React.createElement("img", {
    src: imgUrl,
    alt: product.name,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    onError: e => {
      e.target.style.display = 'none';
      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: imgUrl ? 'none' : 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      color: 'var(--ink-500)',
      opacity: 0.7,
      padding: '4px 8px',
      border: '1px dashed var(--ink-400)',
      borderRadius: 4
    }
  }, product.brand, " \xB7 ", product.sku)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10
    }
  }, product.official && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge badge-primary",
    style: {
      fontSize: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 10
  }), " Ch\xEDnh h\xE3ng")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.35,
      marginBottom: 6,
      fontWeight: 500,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      height: 36
    }
  }, product.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--price)',
      fontSize: 16,
      fontWeight: 700
    }
  }, window.formatVND(product.base_price))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      color: 'var(--ink-600)'
    }
  }, /*#__PURE__*/React.createElement(Stars, {
    rating: product.rating,
    size: 11,
    showNum: false
  }), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, "\u0110\xE3 b\xE1n ", product.sold > 1000 ? (product.sold / 1000).toFixed(1) + 'k' : product.sold)), product.stock <= 50 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 11,
      color: 'var(--warn)'
    }
  }, "C\xF2n ", product.stock, " s\u1EA3n ph\u1EA9m")));
};
Object.assign(window, {
  Icon,
  PhImg,
  Stars,
  TrustStrip,
  Header,
  Footer,
  ProductCard
});
