# 🚀 HƯỚNG DẪN DEPLOY GAME "HỨNG SẢN PHẨM" LÊN WEB ĐỂ MỌI NGƯỜI CÙNG VÀO CHƠI

Trò chơi đã được chuyển thể hoàn chỉnh sang phiên bản **Web Arcade (HTML5 + CSS3 + Google MediaPipe AI)**.
- **Không cần cài đặt Python hay thư viện**: Người chơi chỉ cần nhấp vào link web là chơi được ngay trên máy tính hoặc điện thoại!
- **AI MediaPipe chạy 100% trên trình duyệt (Client-side)**: Tốc độ 60 FPS mượt mà, không giật lag, không tốn chi phí máy chủ server.
- **Có đầy đủ tính năng**: Nhận diện bàn tay webcam, chế độ chơi bằng chuột/cảm ứng, nổ hạt pháo hoa confetti, hiệu ứng âm thanh sống động, mở khóa voucher VIP, và Bảng Xếp Hạng đua top cùng bạn bè.

> [!IMPORTANT]
> **Yêu cầu quan trọng về Camera Webcam trên Web:**
> Mọi trình duyệt web hiện đại (Google Chrome, Microsoft Edge, Safari) đều **bắt buộc trang web phải có HTTPS** (kết nối bảo mật) thì mới cho phép người chơi bật camera.
> Tất cả các dịch vụ dưới đây (**Vercel, Netlify, GitHub Pages, Firebase**) đều **tự động cấp chứng chỉ HTTPS miễn phí 100%**, người chơi sẽ nhận được thông báo "Cho phép trang web sử dụng máy ảnh" và bấm Cho phép là chơi được ngay!

---

## 🌟 CÁCH 1: DEPLOY LÊN VERCEL (Khuyên dùng - Nhanh nhất & Dễ nhất)

Vercel là nền tảng máy chủ web miễn phí tốt nhất hiện nay, tự động kích hoạt HTTPS.

### Cách 1.1: Deploy qua giao diện Web Vercel (Không cần gõ lệnh)
1. Đăng ký tài khoản miễn phí tại: **[vercel.com](https://vercel.com)** (đăng nhập nhanh bằng GitHub hoặc Google).
2. Tải toàn bộ thư mục code của bạn lên GitHub (hoặc tạo 1 repository mới trên GitHub).
3. Trên trang Vercel Dashboard, bấm nút **"Add New..."** ➔ chọn **"Project"**.
4. Chọn repository GitHub vừa tải lên ➔ bấm **"Deploy"**.
5. Đợi khoảng 20 giây, Vercel sẽ cung cấp cho bạn một đường link công khai (ví dụ: `https://hung-san-pham.vercel.app`).
6. **Xong!** Gửi link này cho bạn bè, khách hàng để mọi người cùng vào chơi!

### Cách 1.2: Deploy bằng dòng lệnh Vercel CLI (30 giây)
Mở PowerShell tại thư mục game và chạy:
```powershell
npx vercel
```
Làm theo hướng dẫn trên màn hình (nhấn Enter để chọn mặc định). Sau 1 phút bạn sẽ có link web trực tuyến!

---

## ⚡ CÁCH 2: DEPLOY LÊN NETLIFY (Kéo & Thả chuột - Không cần tài khoản GitHub)

Nếu bạn không muốn tạo repository trên GitHub:
1. Đăng ký tài khoản miễn phí tại: **[netlify.com](https://www.netlify.com)**.
2. Đăng nhập vào trang quản trị (Team Overview) ➔ chọn mục **"Sites"**.
3. Bạn sẽ thấy một ô ghi **"Want to deploy a new site without connecting to Git? Drag and drop your site output folder here"**.
4. Nắm thư mục code game (`Catch_Products`) và **kéo thả trực tiếp** vào ô đó trên trình duyệt.
5. Netlify sẽ tải lên trong 10 giây và cấp cho bạn một đường link HTTPS ngay lập tức (ví dụ: `https://catch-products.netlify.app`).

---

## 🐙 CÁCH 3: DEPLOY LÊN GITHUB PAGES (Miễn phí vĩnh viễn)

1. Đẩy mã nguồn dự án lên một Repository trên GitHub của bạn:
   ```bash
   git init
   git add .
   git commit -m "Web Arcade Edition"
   git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
   git push -u origin main
   ```
2. Trên GitHub, vào mục **Settings** của repository ➔ chọn thẻ **Pages** ở cột bên trái.
3. Ở mục **Build and deployment**:
   - **Source**: Chọn `Deploy from a branch`.
   - **Branch**: Chọn nhánh `main` (hoặc `master`), thư mục chọn `/ (root)`.
4. Bấm **Save**. Sau 1-2 phút, GitHub sẽ tạo link trang web tại: `https://<tai-khoan-cua-ban>.github.io/<ten-repo>/`.

---

## 🔥 CÁCH 4: DEPLOY LÊN FIREBASE HOSTING

Nếu bạn muốn sử dụng Google Firebase:
1. Cài đặt Firebase CLI (nếu chưa có):
   ```powershell
   npm install -g firebase-tools
   ```
2. Đăng nhập:
   ```powershell
   firebase login
   ```
3. Khởi tạo hosting (chọn project Firebase của bạn):
   ```powershell
   firebase init hosting
   ```
   *(Khi hỏi thư mục public, chọn thư mục hiện tại `.` và không ghi đè `index.html`)*
4. Triển khai lên web:
   ```powershell
   firebase deploy --only hosting
   ```

---

## 💻 CÁCH CHƠI THỬ TRƯỚC NGAY TRÊN MÁY TÍNH CỦA BẠN (LOCAL TEST)

Chỉ cần **nhấp đúp chuột vào file `run_web.bat`** trong thư mục game:
- Trình duyệt web sẽ tự động mở trang `http://localhost:8000`.
- Bạn có thể kiểm tra camera webcam, cử chỉ tay AI, âm thanh, thử tải ảnh sản phẩm mới lên trước khi deploy lên internet!
