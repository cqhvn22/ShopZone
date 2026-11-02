# Thiết kế dữ liệu đã triển khai

| Database | Bảng / collection |
| --- | --- |
| auth_db | users, roles, user_roles, outbox_events, processed_events |
| product_db (MongoDB) | categories, products (embedded variants) |
| order_db | orders, order_items, order_status_history, carts, cart_items, outbox_events, processed_events |
| inventory_db | stock_items, reservation_batches, stock_reservations, outbox_events, processed_events |
| payment_db | payment_locks, payments, payment_transactions, outbox_events, processed_events |
| notification_db | notifications, outbox_events, processed_events |

Migration SQL là nguồn định nghĩa schema: mỗi service có `src/main/resources/db/migration/V1__event_store.sql` và `V2__*.sql`. JPA chạy `ddl-auto=validate`. MongoDB tạo index khi khởi động.

- UUID cho định danh nghiệp vụ; outbox dùng BIGSERIAL nội bộ để giữ thứ tự phát.
- Tiền dùng NUMERIC(18,2), MongoDB Decimal128 và Java BigDecimal; currency VND.
- Thời gian dùng TIMESTAMPTZ/Instant, lưu UTC.
- Order giữ snapshot email, địa chỉ, tên hàng và giá; dữ liệu lịch sử không đổi theo catalog.
- Không có foreign key giữa các service. UUID customerId/productId chỉ là tham chiếu logic.
- User roles dùng tên vai trò làm khóa thay vì UUID role trung gian. Giỏ hàng có một bản ghi trên mỗi customer.
- Order items và history dùng JPA ElementCollection, khóa `(order_id,line_number)` và `(order_id,entry_number)` thay vì UUID riêng mỗi dòng.
- Inventory thêm reservation_batches để khóa theo đơn và lưu tombstone khi hủy đến trước tạo.
- Payment thêm payment_locks để serialize callback/cancel và chặn request đến muộn sau hủy.
- Payment status bổ sung CANCELLED ngoài PENDING/SUCCESS/FAILED/REFUNDED.
- Outbox payload lưu TEXT JSON; JSONB được dùng cho shipping_address. Không cần query nội dung outbox nên TEXT giảm phụ thuộc mapping JPA.

Các thay đổi trên là lựa chọn triển khai cụ thể hóa FLOW.md; không thay đổi quyền sở hữu dữ liệu của bounded context.

Unique index bảo vệ email, product slug, SKU giữa product documents, orderCode, `(customer_id,idempotency_key)`, `(order_id,sku)`, payment.order_id, payment.idempotency_key, `(provider,provider_transaction_id)` và `(event_id,channel)` của notification. Product Service còn kiểm tra SKU lặp trong chính một document.

CHECK constraint bảo vệ số lượng dương, tiền không âm, reserved trong [0,on_hand], tổng dòng đơn bằng quantity*unit_price và các trạng thái hợp lệ. Domain/application kiểm tra thứ tự chuyển trạng thái. CHECK danh sách trạng thái không thể thay thế state machine.

PostgreSQL init cấp user riêng cho từng database và thu hồi quyền CONNECT mặc định của PUBLIC. Trong demo các user dùng cùng DB_PASSWORD; khi triển khai nhiều môi trường nên cấp mật khẩu riêng và quản lý secret bên ngoài.
