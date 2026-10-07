/**
 * ============================================================
 * 🏷️ BRAND CONFIGURATION - CẤU HÌNH NHÃN HÀNG TRONG 30 GIÂY
 * Chỉ cần chỉnh sửa các thông tin dưới đây để đổi toàn bộ giao diện game!
 * ============================================================
 */

window.BRAND_PRESETS = {
  highlands: {
    name: "Highlands Coffee",
    title: "HỨNG CÀ PHÊ HIGHLANDS",
    badge: "✨ HIGHLANDS COFFEE PROMO",
    primaryColor: "#B22222", // Đỏ Highlands
    accentColor: "#F59E0B",  // Vàng hạt cà phê
    voucherCode: "HIGHLANDS-VIP",
    voucherDiscount: "GIẢM 30%",
    voucherTarget: 15,
    voucherDesc: "Nhận ngay mã ưu đãi 30% cho tất cả thức uống Highlands!"
  },
  pepsi: {
    name: "Pepsi",
    title: "HỨNG LON PEPSI BÙNG NỔ",
    badge: "✨ PEPSI REFRESH ARCADE",
    primaryColor: "#004B93", // Xanh dương Pepsi
    accentColor: "#EF4444",  // Đỏ Pepsi
    voucherCode: "PEPSI-SANGKHOAI",
    voucherDiscount: "TẶNG 1 LON",
    voucherTarget: 15,
    voucherDesc: "Nhận ngay voucher đổi lon Pepsi mát lạnh tại các điểm bán!"
  },
  coca: {
    name: "Coca-Cola",
    title: "HỨNG COCA-COLA BẬT NẮP",
    badge: "✨ COCA-COLA TASTE THE FEELING",
    primaryColor: "#E11D48", // Đỏ Coca
    accentColor: "#FFFFFF",
    voucherCode: "COCA-REALMAGIC",
    voucherDiscount: "GIẢM 25%",
    voucherTarget: 15,
    voucherDesc: "Bật nắp săn quà cùng Coca-Cola ngay hôm nay!"
  },
  starbucks: {
    name: "Starbucks",
    title: "HỨNG STARBUCKS COFFEE",
    badge: "✨ STARBUCKS REWARDS",
    primaryColor: "#00704A", // Xanh lá Starbucks
    accentColor: "#D4AF37",  // Vàng kim
    voucherCode: "STARBUCKS-VIP",
    voucherDiscount: "FREE UPSIZE",
    voucherTarget: 15,
    voucherDesc: "Miễn phí nâng size đồ uống khi xuất trình mã này!"
  },
  shopee: {
    name: "Shopee",
    title: "HỨNG QUÀ XU SHOPEE",
    badge: "✨ SHOPEE 100% HOÀN XU",
    primaryColor: "#EE4D2D", // Cam Shopee
    accentColor: "#FBBF24",
    voucherCode: "SHOPEE-VOUCHER50K",
    voucherDiscount: "GIẢM 50K",
    voucherTarget: 15,
    voucherDesc: "Áp dụng cho đơn hàng bất kỳ trên ứng dụng Shopee!"
  },
  momo: {
    name: "MoMo",
    title: "HỨNG LỘC VÍ MOMO",
    badge: "✨ VÍ ĐIỆN TỬ MOMO",
    primaryColor: "#A50064", // Tím hồng MoMo
    accentColor: "#FCD34D",
    voucherCode: "MOMO-LUCKY100K",
    voucherDiscount: "TẶNG 100K",
    voucherTarget: 15,
    voucherDesc: "Hoàn tiền hoặc giảm giá khi thanh toán qua MoMo!"
  }
};

// Cấu hình mặc định áp dụng khi mở game
window.ACTIVE_BRAND = {
  name: "Arcade Pop",
  title: "HỨNG SẢN PHẨM",
  badge: "✨ POP ARCADE EDITION • WEB ONLINE",
  primaryColor: "#4F46E5",
  accentColor: "#F59E0B",
  voucherCode: "CATCH15-VIP",
  voucherDiscount: "GIẢM 20%",
  voucherTarget: 15,
  voucherDesc: "Bạn đã xuất sắc săn được mã Voucher VIP độc quyền!",
  productImages: [] // Nếu để rỗng sẽ dùng 6 sản phẩm mặc định
};
