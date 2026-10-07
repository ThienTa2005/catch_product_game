# ⚡ BÍ KÍP ĐỔI GIAO DIỆN & SẢN PHẨM NHÃN HÀNG TRONG VÒNG 2 PHÚT

Khi được giao bất kỳ thương hiệu/sản phẩm nào vào phút chót, bạn có **3 cách siêu tốc** dưới đây để đổi toàn bộ nhận diện game:

---

## 🚀 CÁCH 1: ĐỔI TRỰC TIẾP TRÊN WEB TRONG 10 GIÂY (Khuyên Dùng Nhất - Không Cần Sửa Code)

Bạn có thể thao tác ngay trên điện thoại hoặc máy tính mà không cần mở VS Code hay Git:

1. Mở trang web game lên, nhìn góc trên bên phải bấm nút: **`🎨 Đổi Nhãn Hàng`**.
2. Một bảng điều khiển hiện ra:
   - **Chọn nhanh 1 Click:** Chọn một trong các mẫu có sẵn (☕ Highlands Coffee, 🥤 Pepsi, 🔴 Coca-Cola, 🟢 Starbucks, 🟠 Shopee, 🟣 MoMo).
   - **Hoặc tự gõ tùy ý:**
     - Tên thương hiệu (VD: *Vinamilk*)
     - Tiêu đề game (VD: *HỨNG SỮA TƯƠI VINAMILK*)
     - Chọn màu chủ đạo (Color Picker)
     - Nhập mã Voucher (VD: *VINAMILK-VIP*) và Mức giảm (*GIẢM 25%*)
3. **Tải ảnh sản phẩm:** Bấm nút **`📁 Tải ảnh sản phẩm`** để chọn 1 hoặc nhiều ảnh sản phẩm của nhãn hàng. Game sẽ **tự động tách nền trong 1 giây**.
4. Bấm **`💾 ÁP DỤNG NGAY`** ➔ Toàn bộ giao diện, màu sắc neon, banner, vật rơi và voucher đổi sang nhãn hàng mới tức thì!
5. **Đặc biệt:** Bấm nút **`🔗 Tạo Link Chứa Nhãn Hàng Này`** để sao chép đường link gửi cho giám khảo/khách hàng. Khi họ mở link đó lên, game sẽ tự động mang nhận diện nhãn hàng đó ngay lập tức!

---

## ⚡ CÁCH 2: DÙNG ĐƯỜNG LINK THẦN TỐC (Chỉ Mất 5 Giây)

Bạn chỉ cần thêm tham số vào đuôi link web hiện tại là game tự biến hình:

### Dùng Preset có sẵn:
- **Highlands Coffee:** `https://game-smoky.vercel.app/?preset=highlands`
- **Pepsi:** `https://game-smoky.vercel.app/?preset=pepsi`
- **Coca-Cola:** `https://game-smoky.vercel.app/?preset=coca`
- **Starbucks:** `https://game-smoky.vercel.app/?preset=starbucks`
- **Shopee:** `https://game-smoky.vercel.app/?preset=shopee`
- **MoMo:** `https://game-smoky.vercel.app/?preset=momo`

### Hoặc tự tạo link bất kỳ:
```
https://game-smoky.vercel.app/?brand=Nike&title=HỨNG+GIÀY+NIKE&color=%23FF5500&voucher=NIKE50K&discount=GIẢM+50K
```
*(Chỉ cần gửi link này, người mở lên sẽ thấy toàn bộ game đổi sang nhãn hàng Nike mà không cần deploy lại)*

---

## 💻 CÁCH 3: SỬA CODE CỐ ĐỊNH TRONG 30 GIÂY

Nếu bạn đang ngồi trước máy tính và muốn cập nhật mã nguồn vĩnh viễn:

1. Mở file **`brand_config.js`** trong thư mục dự án.
2. Sửa thông tin trong biến `ACTIVE_BRAND`:
   ```javascript
   window.ACTIVE_BRAND = {
     name: "Tên Thương Hiệu",
     title: "HỨNG SẢN PHẨM CỦA BẠN",
     primaryColor: "#MÃ_MÀU_HEX", // VD: #004B93 cho Pepsi, #00704A cho Starbucks
     voucherCode: "MÃ-VOUCHER",
     voucherDiscount: "GIẢM 30%",
     voucherDesc: "Mô tả ưu đãi..."
   };
   ```
3. Mở terminal gõ:
   ```powershell
   git commit -am "rebrand" ; git push origin main
   ```
4. Vercel sẽ tự động build lại và cập nhật sau 20 giây!
