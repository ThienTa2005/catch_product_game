# ⚡ HƯỚNG DẪN ĐỔI NHÃN HÀNG & HÌNH NỀN TRONG 2 PHÚT (BẢO MẬT - KHÔNG LỘ CHO NGƯỜI CHƠI)

Để đảm bảo người chơi và khách hàng chỉ nhìn thấy giao diện game thương hiệu hoàn chỉnh, chuyên nghiệp mà **không nhìn thấy bất kỳ nút cấu hình, đổi nhãn hàng hay tải ảnh nào**, toàn bộ chức năng quản trị đã được bảo mật qua file mã nguồn và thư mục `assets/`.

Khi bạn nhận được nhãn hàng và sản phẩm mới vào phút chót, bạn chỉ mất **dưới 2 phút** để hoàn thành theo các bước siêu tốc sau:

---

## 🖼️ BƯỚC 1: ĐỔI HÌNH NỀN CẢ GAME & TRANG WEB (Mất 15 giây)

1. Lấy ảnh phông nền/poster của nhãn hàng (ảnh ngang, định dạng PNG hoặc JPG).
2. Đổi tên file ảnh thành: **`background.png`**.
3. Kéo thả file đó vào thư mục **`assets/`** để ghi đè lên file cũ:
   ```
   assets/background.png
   ```
4. 👉 **Xong!** Cả trang web và khung game Canvas sẽ tự động hiển thị hình nền mới với lớp phủ neon đồng bộ.

---

## 🎁 BƯỚC 2: ĐỔI SẢN PHẨM RƠI TRONG GAME (Mất 30 giây)

1. Chuẩn bị ảnh sản phẩm (ảnh PNG, JPG chụp sản phẩm).
   > **Lưu ý đặc biệt:** Ảnh sản phẩm bạn thả vào dù còn dính phông nền trắng hay nền studio, hệ thống web game sẽ **tự động tách & xóa nền thông minh sang trong suốt (Transparent)** trước khi đưa vào game rơi và hiển thị ở khay sản phẩm!
2. Thả các ảnh sản phẩm vào thư mục:
   ```
   assets/products/
   ```
   *(Ví dụ: `assets/products/lon_nuoc.png`, `assets/products/ly_cafe.png`,...)*
3. Mở file **`brand_config.js`**, tại biến `ACTIVE_BRAND`, cập nhật đường dẫn ảnh vào mảng `productImages`:
   ```javascript
   productImages: [
     'assets/products/lon_nuoc.png',
     'assets/products/ly_cafe.png'
   ]
   ```
   *(Nếu để mảng rỗng `[]`, game sẽ dùng kho 6 sản phẩm mặc định có sẵn)*.

---

## 🏷️ BƯỚC 3: ĐỔI TÊN NHÃN HÀNG, MÀU SẮC & VOUCHER (Mất 30 giây)

Mở file **`brand_config.js`**, sửa mục `window.ACTIVE_BRAND`:
```javascript
window.ACTIVE_BRAND = {
  name: "Pepsi",                             // Tên thương hiệu
  title: "HỨNG LON PEPSI MÁT LẠNH",          // Tiêu đề game
  badge: "✨ PEPSI REFRESH PROMO",           // Huy hiệu góc trên
  primaryColor: "#004B93",                   // Màu chủ đạo (Hex)
  accentColor: "#EF4444",                    // Màu điểm nhấn
  voucherCode: "PEPSI-SANGKHOAI",            // Mã voucher tặng người chơi
  voucherDiscount: "TẶNG 1 LON",             // Mức ưu đãi
  voucherTarget: 15,                         // Bắt đủ 15 điểm để mở voucher
  voucherDesc: "Nhận ngay voucher đổi lon Pepsi tại mọi điểm bán!"
};
```

---

## 🚀 BƯỚC 4: PUSH LÊN GITHUB ĐỂ VERCEL CẬP NHẬT TỰ ĐỘNG (Mất 20 giây)

Mở terminal chạy dòng lệnh sau:
```powershell
git add .
git commit -m "rebrand"
git push origin main
```
Sau khoảng 20-30 giây, website trên Vercel:
👉 **https://game-smoky.vercel.app** sẽ tự động cập nhật nhận diện mới hoàn toàn!

---

## ⚡ MẸO NHANH: DÙNG ĐƯỜNG LINK THẦN TỐC (Không cần sửa code, chỉ 5 giây)

Nếu cần demo nhanh lập tức, bạn có thể gửi link kèm preset:
- **Highlands Coffee:** `https://game-smoky.vercel.app/?preset=highlands`
- **Pepsi:** `https://game-smoky.vercel.app/?preset=pepsi`
- **Coca-Cola:** `https://game-smoky.vercel.app/?preset=coca`
- **Starbucks:** `https://game-smoky.vercel.app/?preset=starbucks`
- **Shopee:** `https://game-smoky.vercel.app/?preset=shopee`
- **MoMo:** `https://game-smoky.vercel.app/?preset=momo`
- **Tùy biến bất kỳ qua URL:**
  `https://game-smoky.vercel.app/?brand=Nike&title=HỨNG+GIÀY+NIKE&color=%23FF5500&voucher=NIKE50K&discount=GIẢM+50K`
