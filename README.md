# HỨNG SẢN PHẨM BẰNG BÀN TAY – PYTHON (POP ARCADE EDITION)

Game webcam hứng sản phẩm bằng AI bàn tay MediaPipe: hình sản phẩm rơi trên nền camera, đưa tay thật vào vùng rơi để bắt. Giao diện phong cách **Pop & Colorful Arcade** rực rỡ, sống động, âm thanh hiệu ứng chân thực và nhiều tính năng hấp dẫn!

## Tính năng nổi bật mới
- 🎨 **Giao diện Pop & Colorful Arcade**: Màu sắc rực rỡ, viền neon, màn hình chờ chuyển động, thanh HUD hiển thị điểm & thời gian trực quan.
- 📦 **Tải lên nhiều ảnh sản phẩm**: Chọn cùng lúc nhiều ảnh hoặc bổ sung thêm ảnh vào kho, sản phẩm sẽ rơi ngẫu nhiên từ danh sách bạn chọn kèm thanh thumbnail xem trước.
- 🧋 **Bộ 6 ảnh sản phẩm mẫu sắc nét**: Trà sữa trân châu, lon nước ngọt, hộp quà may mắn, đồng xu sao, bánh donut dâu, kim cương đá quý.
- 🔥 **Hệ thống Combo & Streak**: Hứng liên tiếp tăng combo (x2, x3, Fever!), thưởng điểm ngoạn mục.
- 🏆 **Kỷ lục & Đánh giá cấp bậc**: Lưu High Score tự động, xếp hạng thành tích sau mỗi ván (Hạng S, A, B, C) kèm tỷ lệ chính xác.
- ✨ **Hiệu ứng hạt & va chạm**: Nổ pháo hoa rực rỡ (Confetti Particle FX), vòng sóng xung kích và rung nhẹ màn hình khi bắt trúng.
- 🎁 **Săn Voucher & Chia sẻ hành trình**: Khi đạt mốc 15 điểm (tùy chỉnh được), game tự động tạm dừng và bật thẻ Voucher quà tặng phong cách Arcade! Người chơi có nút **[📤 Chia sẻ hành trình]** để tự động copy lời chia sẻ & mã voucher gửi bạn bè (Facebook/Zalo) để kích hoạt voucher.
- 🔊 **Âm thanh Arcade sống động**: Tiếng chuông ting ting khi bắt trúng, âm thanh combo, âm thanh mở voucher, còi báo hết giờ (kèm nút bật/tắt tiếng).


## Chạy trên Windows
1. Cài Python 3.11/3.12 bản 64-bit từ https://www.python.org/downloads/.
2. Nhấp đúp `setup_windows.bat` một lần để cài thư viện.
3. Nhấp đúp `run_windows.bat` để mở game.
4. Bấm **▶ Bắt đầu / Chơi lại** để trải nghiệm!

## Quản lý ảnh sản phẩm & Tự động xóa nền
- ✂️ **Tự động xóa nền (Auto Remove Background)**: Khi bạn tải ảnh lên (JPG, PNG, WEBP, BMP), game sẽ tự động nhận diện và tách phông nền trắng/màu studio hoặc nền ảnh phức tạp, chuyển sang nền trong suốt và cắt sát vật phẩm trước khi đưa vào game. Bạn có thể bật/tắt tùy chọn này bằng ô **[✂️ Tự xóa nền]** ngay trên thanh kho ảnh.
- **📁 Chọn bộ ảnh mới**: Mở hộp thoại chọn 1 hoặc nhiều ảnh (giữ Ctrl hoặc kéo chọn nhiều ảnh).
- **➕ Thêm ảnh**: Bổ sung thêm ảnh vào danh sách sản phẩm hiện tại mà không làm mất ảnh cũ.
- **↺ Mẫu gốc**: Quay lại 6 ảnh sản phẩm arcade mặc định.
- Thanh xem trước hiển thị tất cả ảnh đang có trong kho rơi ngẫu nhiên.



## Cách chơi và cài đặt
- Đưa bàn tay trong vùng camera, giữ ở dưới vật đang rơi. Tránh che khuất tay, đủ sáng, để tay cách camera khoảng phù hợp để thấy rõ cả bàn tay.
- Vùng xanh cho biết vùng được tính bắt (lòng bàn tay + gốc ngón). Đây là va chạm 2D trên ảnh, không mô phỏng tiếp xúc 3D hay xác minh tư thế lòng bàn tay ngửa.
- Mỗi sản phẩm chỉ cộng HOẶC trừ điểm đúng một lần; bắt ở bất kỳ vị trí cao thấp nào đều được.
- Không thấy tay thì vật vẫn rơi và vẫn trừ điểm khi hụt, như luật chơi.
- **Điểm bắt / Điểm trừ**: nhập số không âm; điểm trừ là lượng bị trừ.
- **Tốc độ**: pixel/giây; mặc định 180. **Nhịp rơi**: giây/sản phẩm; số nhỏ = nhiều sản phẩm hơn.
- **Cỡ ảnh**: 24–160 pixel. **Giây**: thời lượng ván, 0 = không giới hạn.
- **Camera ID**: 0 thường là webcam chính; thử 1 hoặc 2 nếu dùng webcam ngoài.
- Cài đặt áp dụng khi nhấn Bắt đầu; nút này cũng đặt lại điểm.
- **Space** hoặc nút Tạm dừng: dừng rơi và dừng thời gian.
- **F11**: toàn màn hình; **Esc**: thoát toàn màn hình; nút X để thoát game.
- Chế độ **Thử bằng chuột** chạy không cần camera/mô hình: di chuột trong khung để kiểm tra luật chơi. Đây là chế độ thử riêng, không thay thế chế độ bàn tay thật.

## Khắc phục lỗi
- Không có `mediapipe`, `cv2` hoặc `PIL`: chạy lại setup_windows.bat hoặc pip trong đúng môi trường .venv.
- Không mở camera: đóng Zoom/Teams/ứng dụng camera; bật quyền camera cho desktop apps; đổi Camera ID.
- Không tải được mô hình: kiểm tra Internet. Có thể tải thủ công từ URL sau, lưu tên `models/hand_landmarker.task`:
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
- Lỗi mô hình: xóa riêng file `models/hand_landmarker.task` rồi mở lại để tải lại.
- Hình có khung trắng: dùng PNG đã xóa nền, không chỉ đổi đuôi JPG thành PNG.
- Nhận tay kém: bật vùng hứng, tăng ánh sáng, đưa bàn tay rõ vào camera; giảm tốc độ để tập.

## Tệp mã nguồn
- main.py: cửa sổ, webcam, MediaPipe Hand Landmarker, ảnh và điều khiển.
- engine.py: vật rơi, va chạm quét theo chuyển động, điểm số và thời gian.
- test_engine.py: kiểm tra bắt, hụt, điểm âm, tránh cộng lặp và hết giờ.

Camera được xử lý tại máy; code không gửi hình camera lên máy chủ. Chỉ bước tải mô hình và cài thư viện cần Internet.

## Kiểm thử và giới hạn
Đã kiểm tra cú pháp và logic game bằng kiểm thử tự động. Môi trường tạo mã không có webcam vật lý, nên chưa kiểm chứng nhận bàn tay và giao diện webcam trực tiếp trên máy người dùng. Độ nhận diện phụ thuộc camera, ánh sáng và cấu hình máy.

API bàn tay tham khảo tài liệu chính thức:
https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/python
