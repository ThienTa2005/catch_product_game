@echo off
chcp 65001 >nul
title 🎮 Hứng Sản Phẩm Arcade - Web Server
echo ========================================================
echo   🎮 ĐANG KHỞI CHẠY GAME HỨNG SẢN PHẨM TRÊN WEB
echo ========================================================
echo.
echo [1] Đang mở trình duyệt tại địa chỉ: http://localhost:8000
start http://localhost:8000
echo.
echo [2] Web Server đang chạy tại cổng 8000.
echo     (Giữ cửa sổ này mở trong khi chơi game)
echo     Nhấn Ctrl+C để dừng server khi muốn thoát.
echo.
python -m http.server 8000
pause
