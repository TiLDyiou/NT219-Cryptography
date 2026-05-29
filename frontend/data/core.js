// UIT Store — shared frontend constants/helpers

window.CATEGORIES = [
  { id: 'phone',   name: 'Điện tử & Công nghệ', icon: 'phone' },
  { id: 'fashion', name: 'Thời trang',           icon: 'shirt' },
  { id: 'home',    name: 'Nhà cửa & Đời sống',   icon: 'home' },
  { id: 'beauty',  name: 'Sức khỏe - Làm đẹp',   icon: 'beauty' },
  { id: 'book',    name: 'Sách & Giáo dục',      icon: 'book' },
  { id: 'sport',   name: 'Thể thao & Sức khỏe',  icon: 'sport' },
  { id: 'food',    name: 'Bách hóa online',      icon: 'food' },
  { id: 'toys',    name: 'Đồ chơi - Mẹ & bé',    icon: 'toy' },
];

window.PRODUCTS = [];
window.formatVND = function(n) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n || 0);
};
