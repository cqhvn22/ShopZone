# REST API

Base URL: `http://localhost:8080/api/v1`. Dùng `Authorization: Bearer <accessToken>` sau đăng nhập. JSON chuẩn UTF-8; thời gian ISO 8601 UTC. Giá trả về số thập phân, đơn vị VND.

## Auth và người dùng

| Method | Path | Quyền |
| --- | --- | --- |
| POST | /auth/register | Public |
| POST | /auth/login | Public |
| GET | /users/me | Đăng nhập |
| GET | /users?page=0&size=20 | Admin |
| PATCH | /users/{id}/status | Admin |

Đăng ký: `{"email":"buyer@example.test","password":"LongPassword123!","fullName":"Nguyễn An","phone":"0900000000"}`. Mật khẩu 12–72 byte UTF-8. Đăng nhập chỉ gửi email/password. Response chứa accessToken, tokenType, expiresIn=900 và user. Trạng thái user: ACTIVE, LOCKED, DISABLED. Không trả passwordHash.

## Catalog

| Method | Path | Quyền |
| --- | --- | --- |
| GET | /products?q=phone&categoryId=...&minPrice=0&maxPrice=30000000&page=0&size=20 | Public |
| GET | /products/{id} | Public, chỉ sản phẩm ACTIVE; Admin xem được INACTIVE |
| GET | /products/sku/{sku} | Public, quote giá server |
| POST | /products | Admin |
| PUT | /products/{id} | Admin |
| DELETE | /products/{id} | Admin, soft delete |
| GET | /categories | Public |
| POST | /categories | Admin |
| PUT | /categories/{id} | Admin |
| DELETE | /categories/{id} | Admin, soft delete |

Category body: `{"name":"Điện thoại","slug":"dien-thoai","parentId":null,"active":true}`. Response có id để tạo sản phẩm.

```json
{
  "name": "Demo Phone",
  "slug": "demo-phone",
  "description": "Điện thoại demo",
  "categoryId": "<category-id>",
  "brand": "ShopZone",
  "images": [],
  "attributes": {},
  "variants": [
    {"sku":"PHONE-BLACK-128","price":20000000.00,"attributes":{"color":"Black"},"active":true}
  ]
}
```

Slug chỉ chứa chữ thường, số và dấu gạch ngang. SKU duy nhất toàn catalog. PUT thay thế toàn bộ thông tin sản phẩm/variants trong body; soft delete không tự giải phóng SKU.

## Cart và Order

| Method | Path | Quyền |
| --- | --- | --- |
| GET | /cart | Chủ giỏ hàng |
| POST | /cart/items | Chủ giỏ, body sku/quantity; cộng dồn cùng SKU |
| PATCH | /cart/items/{id} | Chủ giỏ, body quantity |
| DELETE | /cart/items/{id} | Chủ giỏ |
| POST | /orders | Đăng nhập, bắt buộc Idempotency-Key |
| GET | /orders?page=0&size=20 | Customer xem của mình; Admin xem tất cả |
| GET | /orders/{id} | Chủ đơn hoặc Admin |
| POST | /orders/{id}/cancel | Chủ đơn hoặc Admin |
| PATCH | /orders/{id}/status | Admin, body status SHIPPING hoặc COMPLETED |
| GET | /admin/statistics | Admin |

```json
{
  "items": [{"sku":"PHONE-BLACK-128","quantity":2}],
  "paymentMethod":"COD",
  "shippingAddress":{
    "recipient":"Nguyễn An",
    "phone":"0900000000",
    "address":"123 Nguyễn Huệ",
    "city":"TP Hồ Chí Minh"
  }
}
```

`POST /orders` trả **202** với đơn PENDING. Giữ cùng `Idempotency-Key` khi retry một lần checkout; lần mua mới dùng key mới. Giá, customerId, trạng thái và tổng tiền không nhận từ client. Các trường lạ trả 400. Tối đa 100 SKU khác nhau, mỗi SKU 1–10000 sản phẩm.

Giỏ hàng và checkout độc lập: client gửi các dòng đã chọn khi checkout. Bản này không tự xóa giỏ sau checkout, tránh xóa nhầm dòng người dùng đang chỉnh ở phiên khác.

Hủy chỉ áp dụng PENDING/RESERVED; đơn đã hủy gọi lại trả cùng trạng thái. GET đơn người khác trả 404. Shipping yêu cầu stockCommitted=true. Statistics gồm tổng đơn, số đơn COMPLETED và tổng doanh thu các đơn COMPLETED; không tính đơn PENDING/PAID chưa giao xong.

## Inventory, Payment, Notification

| Method | Path | Quyền |
| --- | --- | --- |
| GET | /inventory/{sku} | Đăng nhập |
| PUT | /inventory/{sku} | Admin, body `{"onHand":10}` |
| GET | /payments/{orderId} | Chủ đơn hoặc Admin |
| POST | /payments/callback | Chữ ký HMAC server-to-server |
| GET | /notifications?page=0 | Chỉ thông báo của người đang đăng nhập |

Inventory response dùng tên cột `on_hand`, `reserved`, `available`. Không cho chỉnh onHand xuống dưới reserved. Các API giữ/commit/release không công khai; thực hiện qua Kafka.

Callback **mô phỏng**:

```json
{"orderId":"<uuid>","transactionId":"demo-transaction-001","amount":40000000.00,"currency":"VND","status":"SUCCESS"}
```

Header `X-Payment-Signature` = HMAC-SHA256 hex lowercase, key `PAYMENT_CALLBACK_SECRET`, chuỗi ký:

```text
orderId|transactionId|amount_2_decimal_places|currency|status
```

Ví dụ amount là `40000000.00`. Status SUCCESS hoặc FAILED. Transaction ID chỉ chữ/số/underscore/gạch ngang. Callback xác minh cả chữ ký, số tiền, currency, payment method và idempotency. Script `smoke.mjs` minh họa bên cung cấp mock ký request; không đưa secret vào frontend.

## Mã lỗi

| HTTP | Ý nghĩa |
| --- | --- |
| 400 | Payload/validation không hợp lệ, SKU không bán được |
| 401 | Thiếu JWT, JWT sai/hết hạn, login thất bại, chữ ký callback sai |
| 403 | Không đủ vai trò |
| 404 | Không tồn tại hoặc không sở hữu tài nguyên |
| 409 | Email/SKU/slug trùng, idempotency key xung đột, trạng thái không cho phép |
| 429 | Gateway giới hạn request |
| 503 | Product Service không phản hồi khi checkout |

Lỗi nghiệp vụ và validation dùng ProblemDetail (`status`, `detail`, `title`). Lỗi security mặc định của Spring có thể không chứa body. Phân trang giới hạn 100 dòng, notifications 50 dòng/trang.
