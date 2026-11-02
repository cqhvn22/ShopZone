# ShopZone — Spring Boot Microservices

Backend thương mại điện tử triển khai từ FLOW.md: Java 17, Spring Boot 3.5.16, Spring Cloud 2025.0.3, PostgreSQL, MongoDB, Kafka, JWT/RBAC, Flyway, Saga và Transactional Outbox.

## Kết nối CSDL và nạp dữ liệu phát triển

Mở Docker Desktop, đợi **Engine running**, rồi chạy PowerShell tại thư mục này:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-database.ps1
```

Nếu giao diện Node đã chạy riêng tại cổng 3000, thêm `-HostFrontend` để chỉ khởi động các service backend và hạ tầng. Script cập nhật `frontend/.env.local` sang `SHOPZONE_DATA_MODE=backend`; cần khởi động lại frontend nếu tiến trình cũ vẫn ở chế độ demo.

Script khởi động hạ tầng, chờ API sẵn sàng, nạp qua API rồi đọc trực tiếp PostgreSQL/MongoDB để kiểm tra số bản ghi. Bộ dữ liệu gồm 5 danh mục, 18 sản phẩm/SKU, tồn kho ban đầu 30 mỗi SKU, 3 khách hàng, 6 đơn COD (2 hoàn tất, 2 đang giao, 2 xác nhận), giỏ hàng, thanh toán và thông báo. Đơn hàng trừ tồn kho qua Saga; tồn còn lại phụ thuộc các đơn đã tạo.

Đây là **dữ liệu nghiệp vụ mẫu được lưu vào CSDL thật**, không phải thông tin khách hàng hay giao dịch tiền thật. Hình ảnh, mô tả và giá sản phẩm phục vụ phát triển, cần xác minh trước khi bán hàng.

- `.env`: thông tin quản trị được tạo từ lần khởi động đầu.
- `.seed-state.json`: email/mật khẩu khách mẫu và khóa chống tạo trùng đơn; giữ file này để chạy lại an toàn. Không chia sẻ file.
- `.seed-report.json`: báo cáo đọc lại API và số bản ghi trực tiếp trong CSDL sau khi script hoàn tất.

Hai file seed được loại khỏi Git và Docker build context. Script không đặt lại tồn kho đã có, không xóa volumes, không đổi mật khẩu tài khoản có sẵn. Nếu dừng giữa chừng, sửa lỗi rồi chạy lại cùng lệnh. Khi backend đã chạy, có thể chỉ nạp dữ liệu bằng `node .\scripts\seed-data.mjs`.

Kiểm thử khả năng chạy lại và phục hồi seed (dùng API giả lập, không thay cho kiểm thử CSDL):

```powershell
node --test .\scripts\tests\seed-data.test.mjs
```

## Chạy toàn bộ bằng Docker

Cần Docker Desktop với Linux containers và Docker Compose v2. Dành khoảng 6–8 GB RAM cho Docker. Không cần cài Maven hoặc Java trên máy nếu chỉ chạy bằng Docker.

Mở PowerShell tại thư mục chứa file README này:

Khởi động và kiểm tra API bằng một lệnh, sau khi Docker Desktop báo Engine running:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -Smoke
```

Hoặc thực hiện từng bước:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-env.ps1
docker compose up --build -d --wait --wait-timeout 600
docker compose ps
```

- Giao diện cửa hàng: http://localhost:3000
- API Gateway: http://localhost:8080
- Health: http://localhost:8080/actuator/health
- Hộp thư demo Mailpit: http://localhost:8025
- Tài khoản quản trị và mật khẩu ngẫu nhiên nằm trong `.env`. Admin chỉ được tạo khi email chưa tồn tại; thay `ADMIN_PASSWORD` sau đó không đổi mật khẩu trong database.

Lần khởi động đầu cần tải image và thư viện. Mỗi service tự chạy Flyway trước khi nhận request. File `.env.example` giải thích các biến cấu hình; script `init-env.ps1` sinh giá trị thật và không ghi đè file đã tồn tại.

Kiểm thử API đầy đủ, cần Node.js 18 trở lên và hệ thống đang chạy:

```powershell
node .\scripts\smoke.mjs
```

Script tạo dữ liệu demo mới mỗi lần chạy và kiểm tra đăng ký, RBAC, sản phẩm, giỏ hàng, COD, tồn kho, thanh toán thất bại/thành công, callback, hủy đơn, hoàn tiền khi callback đến muộn, vận chuyển và thông báo. Thư viện chỉ dùng sẵn trong Node.js, không cần `npm install`.

Xem log hoặc dừng hệ thống:

```powershell
docker compose logs -f order-service inventory-service payment-service
docker compose down
```

`down` giữ dữ liệu trong volumes. PostgreSQL chỉ chạy script tạo database/user khi volume được khởi tạo lần đầu. Đổi mật khẩu trong `.env` sau khi đã có dữ liệu không tự đổi mật khẩu trong PostgreSQL.

## Mở trong IntelliJ IDEA

1. Open thư mục này hoặc `pom.xml`, import dưới dạng Maven project.
2. Chọn Project SDK **Java 17** hoặc mới hơn, Maven dùng Maven Wrapper.
3. Chạy `scripts/init-env.ps1` một lần, nếu chưa có `.env`.
4. Khởi động hạ tầng:

```powershell
docker compose up -d postgres mongodb kafka mailpit
```

5. Thêm các biến trong `.env` vào Environment variables của từng Run Configuration. Thêm `DB_USER=auth_user`, `order_user`, `inventory_user`, `payment_user` hoặc `notification_user` theo service. Các URL localhost đã có mặc định trong `application.yml`.
6. Chạy `AuthApplication`, `ProductApplication`, `OrderApplication`, `InventoryApplication`, `PaymentApplication`, `NotificationApplication`, rồi `GatewayApplication`.

Các service mặc định dùng các cổng 8081–8086; Gateway dùng 8080. Không chạy đồng thời cùng một service bằng Docker và IntelliJ nếu cùng kết nối Kafka consumer group: hai instance sẽ chia partition và có thể gây khó theo dõi khi debug.

Chạy từ terminal với Java 17 và Maven Wrapper:

```powershell
. .\scripts\load-env.ps1
.\mvnw.cmd clean verify
java -jar .\auth-service\target\auth-service-1.0.0-SNAPSHOT.jar
```

Lần chạy Maven Wrapper đầu tiên cần Internet. Với Linux/macOS dùng `sh ./mvnw clean verify` và export các biến môi trường tương ứng. Khi cần truy cập trực tiếp các service đang chạy trong Docker để debug, dùng thêm file `docker-compose.dev.yml`.

## Các thành phần

| Module | Cổng | Dữ liệu và chức năng |
| --- | --- | --- |
| api-gateway | 8080 | Spring Cloud Gateway MVC, JWT, CORS, giới hạn request |
| auth-service | 8081 | PostgreSQL `auth_db`: tài khoản, BCrypt, vai trò, phát JWT |
| product-service | 8082 | MongoDB `product_db`: danh mục, sản phẩm, SKU, Decimal128 |
| order-service | 8083 | PostgreSQL `order_db`: giỏ hàng, đơn, giá snapshot, lịch sử, timeout |
| inventory-service | 8084 | PostgreSQL `inventory_db`: tồn kho, giữ/commit/release nguyên tử |
| payment-service | 8085 | PostgreSQL `payment_db`: COD và thanh toán ONLINE mô phỏng |
| notification-service | 8086 | PostgreSQL `notification_db`: in-app và email qua SMTP/Mailpit |
| common | — | Hợp đồng sự kiện, cấu hình JWT và lỗi HTTP |
| persistence-support | — | Kafka, outbox publisher, processed events |

Thư viện dùng chung không chứa entity hoặc repository dữ liệu nghiệp vụ. Mỗi service có database và user riêng. Một PostgreSQL container được dùng để tiết kiệm tài nguyên demo; các service không truy cập database của nhau. MongoDB/Kafka không bật xác thực trong cấu hình local và các cổng hạ tầng chỉ bind localhost. Khi triển khai thực tế cần tách mạng, TLS, credential riêng từng service và Kafka ACL.

## Quy tắc đã triển khai

- JWT được xác minh ở Gateway và từng service; chỉ ADMIN sửa catalog/tồn kho/trạng thái giao hàng và quản lý tài khoản.
- Email được chuẩn hóa chữ thường; client đăng ký không được tự cấp ADMIN.
- Giá, tên sản phẩm và productId được lấy từ Product Service khi checkout; client chỉ gửi SKU/số lượng. Payload có giá giả hoặc trường lạ bị trả 400.
- `POST /orders` yêu cầu `Idempotency-Key`; retry cùng dữ liệu trả cùng đơn; dùng lại key với dữ liệu khác trả 409. Response 202 nghĩa là đã tiếp nhận, phải theo dõi trạng thái qua GET.
- Không giữ vượt tồn kho; khóa các SKU theo thứ tự cố định để tránh deadlock giữa các đơn nhiều sản phẩm. Reservation đã commit không bị release.
- Đơn COD chuyển CONFIRMED khi giữ hàng xong, payment vẫn PENDING cho tới COMPLETED. Đơn ONLINE chờ callback có chữ ký HMAC; đây là **thanh toán mô phỏng, không giao dịch tiền thật**.
- Chỉ được hủy PENDING/RESERVED. Đơn đã CONFIRMED/PAID cần nghiệp vụ trả hàng riêng. Callback thành công đến sau hủy đơn được hoàn tiền mô phỏng và giữ đơn CANCELLED.
- Sau 20 phút, đơn PENDING/RESERVED được hủy bởi Order Service; sự kiện bù trừ giải phóng kho khi Kafka hoạt động trở lại. Không tự giải phóng reservation đã commit.
- Outbox và nghiệp vụ cùng transaction; chỉ đánh dấu published sau Kafka acknowledgment. Consumer chống lặp cùng transaction với cập nhật nghiệp vụ. Hệ thống dùng at-least-once delivery.
- Email lỗi được retry tối đa 10 lần, không làm thất bại đơn hàng. SMTP có thể gửi lặp nếu tiến trình chết sau gửi nhưng trước commit; không cam kết exactly-once cho email.

Access token hết hạn sau 15 phút. Đăng xuất là xóa token phía client; chưa có refresh token/denylist. Khóa tài khoản chặn đăng nhập mới; token đã phát còn hiệu lực đến lúc hết hạn.

Đã bổ sung **frontend Next.js + React** trong thư mục `frontend`, gồm cửa hàng, giỏ hàng, tài khoản, thanh toán, theo dõi đơn và quản trị. Xem [hướng dẫn frontend](frontend/README.md). Giao diện tại http://localhost:3000; chế độ demo dùng dữ liệu minh họa và chặn giao dịch thật. Tích hợp cổng tiền thật, review/voucher, vận chuyển bên thứ ba, refresh token và trả hàng sau xác nhận chưa nằm trong bản này.

Tài liệu chi tiết: [kiến trúc](docs/architecture.md), [database](docs/database-design.md), [API](docs/api-specification.md), [kịch bản kiểm thử](docs/test-cases.md), [kết quả kiểm tra](docs/verification.md). Dùng [requests.http](docs/requests.http) trong IntelliJ HTTP Client hoặc theo script smoke.

Phiên bản Spring được chọn theo [bảng tương thích Spring Cloud](https://spring.io/projects/spring-cloud/) và [yêu cầu Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html). Cấu hình agent kiểm thử theo [tài liệu Mockito](https://www.javadoc.io/static/org.mockito/mockito-core/5.21.0/org.mockito/org/mockito/Mockito.html).
