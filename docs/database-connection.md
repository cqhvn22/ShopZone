# Kết nối dữ liệu — 18/10/2026

## Đã chuẩn bị

- Giao diện local cấu hình `SHOPZONE_DATA_MODE=backend`, gọi API Gateway tại `http://localhost:8080`; không tự quay về danh mục JSON khi API lỗi.
- `scripts/connect-database.ps1` khởi động Docker Compose, nạp dữ liệu và kiểm tra trực tiếp số bản ghi trên PostgreSQL/MongoDB.
- `scripts/seed-data.mjs` tạo danh mục, sản phẩm/SKU, tồn kho, 3 khách hàng mẫu, 6 đơn COD, 3 giỏ hàng; chờ thanh toán, thông báo và xác nhận tồn kho từ Saga.
- Khóa checkout được lưu trước request để retry không sinh thêm đơn; mật khẩu khách mẫu được sinh ngẫu nhiên và lưu local trong `.seed-state.json`.
- `frontend/scripts/seed-catalog.mjs` bổ sung SKU chưa có tồn kho khi lần chạy trước dừng giữa chừng, giữ nguyên tồn kho đã tồn tại.

## Kết quả kiểm tra hiện tại

4/4 kiểm thử hợp đồng seed qua API giả lập đã qua: bảo toàn tồn kho khi chạy lại, giữ tài khoản/đơn/giỏ hàng, phục hồi khi mất response sau checkout, dừng khi backend lỗi. Kiểm tra cú pháp Node và PowerShell đã qua.

Docker Desktop đã mở và báo Engine running. Sandbox của phiên Codex bị từ chối truy cập named pipe `dockerDesktopLinuxEngine`. Công cụ cấp quyền không hỗ trợ biểu diễn đường dẫn pipe này. Vì vậy **chưa xác nhận tạo database hoặc nạp dữ liệu thật trong phiên này**.

## Lệnh cần chạy ngoài sandbox

Tại PowerShell của Windows:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\chuqu\Documents\Codex\2026-10-16\du\outputs\shopzone\scripts\connect-database.ps1" -HostFrontend
```

Lần đầu cần tải images và build các service. Không dùng `docker compose down -v` hoặc xóa `.seed-state.json` để xử lý lỗi. Chỉ khi lệnh thành công, `.seed-report.json` mới có trường `databaseCounts` đọc từ các storage engine. Dữ liệu vẫn còn trong named volumes khi dừng hoặc khởi động lại container.

Thông tin trong báo cáo này cần được cập nhật sau khi kiểm tra trên CSDL thật; không dùng kết quả API giả lập làm bằng chứng dữ liệu đã được lưu.

## Xác nhận ngày 02/11/2026

Docker Compose đã chạy thành công toàn bộ stack. Nạp dữ liệu và đọc trực tiếp CSDL xác nhận: 4 users, 6 orders, 18 stock_items, 6 payments, 24 notifications, 18 products, 5 categories. Báo cáo chi tiết: .seed-report.json. PostgreSQL được publish tại localhost:5433 do Windows chặn cổng 5432; kết nối trong Docker vẫn dùng postgres:5432. Khi chạy Java trực tiếp trên Windows, đặt DB_URL dùng cổng 5433.
