# Kiểm tra storefront — 18/10/2026

## Kết quả

- Build production Next.js 16.4.2 + React 19.3.1 thành công; toàn bộ trang catalog xuất HTML từ server.
- TypeScript `--noEmit` thành công.
- 14/14 kiểm tra unit và HTTP smoke thành công: HTML có nội dung sản phẩm, H1, canonical/OG, Product/Breadcrumb JSON-LD; các trang chức năng; HTTP 404 thật; chặn index demo; chặn tạo đơn demo; chặn Origin ngoài và callback; session không lộ access token.
- 9/9 kiểm tra hợp đồng BFF thành công với HTTP backend stub cô lập: schema Offer trong backend mode, robots, 404, cookie HttpOnly/SameSite, đọc phiên, chuyển tiếp Bearer token và Idempotency-Key, nhận 403 từ backend, kiểm tra Origin và đăng xuất.
- `docker compose config --quiet` thành công với frontend được thêm vào stack. Không cần daemon để chạy bước kiểm tra cấu hình này.
- Kiểm tra trực tiếp trên trình duyệt: trang chủ ở khung rộng và khung hẹp, tìm MacBook trả 1 sản phẩm, lọc laptop Dell trả 1 sản phẩm, thêm iPhone vào giỏ, tăng lên 2 sản phẩm cập nhật tổng thành 35.980.000 ₫, đi đến thanh toán, nút giao dịch thật bị khóa trong demo, mở trang chi tiết, chuyển tab thông số và lưu yêu thích.
- Đã sửa vùng bố cục legend trong bộ lọc sau khi quan sát trên trình duyệt và kiểm tra lại.

## Phạm vi xác minh

Bản xem trực tiếp chạy tại http://localhost:3000 với `SHOPZONE_DATA_MODE=demo`. Không tạo tài khoản hoặc đơn hàng giả để thể hiện thành công.

Kiểm tra BFF dùng backend HTTP stub chỉ để xác minh hợp đồng request/response. Chưa chạy đặt hàng xuyên toàn bộ các microservice Spring Boot trong lượt triển khai giao diện này: Gateway không phục vụ tại localhost:8080, và quyền truy cập Docker daemon của phiên làm việc bị từ chối. Không coi 9 bài contract test là bằng chứng giao dịch thực đã được chạy.

Chưa đo Lighthouse/Core Web Vitals hoặc kiểm tra Google Search Console trên tên miền thật. Kỹ thuật SEO đã triển khai không phải cam kết thứ hạng tìm kiếm.

## Chạy lại

Trong thư mục `frontend`, dùng `npm ci`, `npm run build`, sau đó `npm start`. Chạy `npm test`, `npm run test:smoke` khi server demo đang mở và `npm run test:contract` sau khi đã build.

Các log đi kèm:

- `frontend-build.log`: build production cuối cùng.
- `frontend-tests.log`: unit + HTTP smoke cuối cùng.
- `frontend-contract.log`: contract test cuối cùng.
