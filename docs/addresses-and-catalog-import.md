# Địa chỉ và công cụ nhập catalog — 02/11/2026

## Sổ địa chỉ

Checkout có lưu/sửa/xóa địa chỉ, chọn địa chỉ đã lưu và đặt mặc định. Mỗi tài khoản có tối đa 20 địa chỉ trong PostgreSQL `auth_db.customer_addresses`, migration V3. API `/api/v1/users/me/addresses` hỗ trợ GET/POST và `/{id}` hỗ trợ PUT/DELETE. Mọi thao tác được giới hạn theo JWT của chủ sở hữu. Không lưu thông tin thẻ ngân hàng.

Đơn hàng lưu thêm `shippingAddress.ward` trong JSONB. Đơn cũ chưa có trường này vẫn đọc được. Giao diện yêu cầu chọn phường/xã theo tỉnh/thành. Danh sách local lấy từ https://provinces.open-api.vn/api/v2/?depth=2 ngày 02/11/2026 (34 tỉnh/thành); không gọi dịch vụ ngoài mỗi lần checkout. File dữ liệu: `frontend/public/data/vn-locations.json`.

## Nhập sản phẩm TGDD

Tại thư mục gốc dự án, khi backend đã chạy và `.env` có tài khoản admin:

```powershell
# Xem trước dữ liệu, chưa ghi DB
node scripts/import-tgdd.mjs --limit 6
# Nhập/cập nhật sản phẩm qua API của dự án
node scripts/import-tgdd.mjs --limit 6 --apply
```

Tool đọc robots.txt và danh mục điện thoại công khai, chờ 1,5 giây giữa các trang, tối đa 20 sản phẩm/lần. Phân tích Product JSON-LD, chỉ chấp nhận offer VND có giá, ảnh từ CDN TGDD; lưu thông số, URL và thời điểm lấy nguồn. Dùng slug/SKU ổn định để chạy lại không trùng. Có thể chỉ định danh sách URL sản phẩm dưới dạng mảng JSON bằng `--urls-file path/to/urls.json`.

Tool lấy danh mục hiện tại của nguồn, **không khẳng định thứ tự ngày ra mắt** khi nguồn thiếu releaseDate/datePublished. Thông tin cập nhật thể hiện thời điểm crawl, không phải ngày ra mắt. Chưa có lịch tự động; chạy lệnh khi cần cập nhật. Khi nguồn trả 403, CAPTCHA hoặc không có dữ liệu hợp lệ, tool dừng và báo lỗi, không tìm cách vượt chặn.

Giá là giá tham khảo từ nguồn. SKU nhập mới có tồn kho ShopZone bằng 0; quản trị viên nhập tồn thực tế trước khi bán. Chạy lại không ghi đè tồn kho. Chỉ hỗ trợ điện thoại (`/dtdd/`) ở phiên bản này. Ảnh sử dụng URL nguồn, không sao chép file ảnh vào repository.

## Kiểm tra

- Backend auth/order/common: 18 tests qua; kiểm tra JSONB có trường phường/xã.
- Kiểm tra trên PostgreSQL: tạo/sửa địa chỉ, một địa chỉ mặc định, đọc lại sau đăng nhập, chặn tài khoản khác sửa/xóa; dữ liệu kiểm thử đã dọn.
- Importer: test VND, loại URL ngoài nguồn, dữ liệu thương hiệu dạng mảng, ảnh ImageObject và chạy lại giữ tồn kho.
- Lần nhập thực tế ngày 02/11/2026: 6 sản phẩm mới từ TGDD.
