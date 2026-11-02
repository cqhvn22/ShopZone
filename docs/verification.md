# Kết quả kiểm tra — 16/10/2026

## Đã chạy thành công

- Java 17.0.12, Apache Maven 3.9.11, Windows 11.
- `mvn clean verify`: BUILD SUCCESS cho toàn bộ 10 module Maven, gồm parent, 2 thư viện và 7 ứng dụng.
- **31 test, 0 failures, 0 errors, 0 skipped** trong bộ kiểm thử mặc định.
- Sau rà soát và sửa việc tải collection khi retry đơn/hủy lặp, validation phần tử null và thống nhất thứ tự khóa SKU: đã chạy lại `verify` cho common, persistence-support, product-service, order-service, inventory-service, kết quả SUCCESS.
- GatewayRoutingTest khởi động Tomcat/Gateway thật và HTTP server test để kiểm tra routing; không dùng các microservice/database thật trong bài test này.
- OrderPersistenceTest xác nhận Hibernate lưu và đọc lại giá snapshot, địa chỉ JSON và lịch sử đơn.
- InventoryTransactionsTest dùng transaction SQL và 20 thread: đúng 10 reservation thành công khi tồn 10, không giữ vượt kho. Kiểm tra rollback, thiếu hàng, duplicate event, release/commit lặp và hủy đến trước tạo.
- Đã đóng gói executable JAR của cả 7 ứng dụng.
- Maven Wrapper tải và chạy Maven 3.9.11 thành công; distribution có SHA-256 pin trong wrapper properties. Môi trường sandbox cần thư mục TEMP nằm trong workspace khi kiểm tra wrapper.
- Hai file Docker Compose parse YAML thành công: 11 service trong file chính, 6 override trong file dev. Đây là kiểm tra cú pháp YAML, không thay thế `docker compose config/up`.
- `smoke.mjs` qua kiểm tra cú pháp Node.js; script PowerShell qua kiểm tra parser. `init-env.ps1` đã chạy trong thư mục thử nghiệm, sinh đủ 7 biến và JWT secret 64 ký tự, không tạo `.env` trong gói bàn giao.
- Profile PostgreSQL đã được biên dịch riêng với `-Ppostgres-tests -DskipTests test`.

| Nhóm test | Số test |
| --- | ---: |
| SecurityContractTest | 5 |
| GatewayRoutingTest | 3 |
| AuthServiceTest | 3 |
| CatalogRulesTest | 2 |
| OrderRulesTest | 5 |
| OrderSagaTest | 4 |
| OrderPersistenceTest | 1 |
| InventoryTransactionsTest | 7 |
| CallbackSignerTest | 1 |
| **Tổng** | **31** |

Log: `build-verify.log` cho lần clean verify toàn bộ; `changed-verify.log` cho lần verify sau sửa cuối.

## Cần môi trường Docker để xác minh tiếp

Máy thực hiện chưa có Docker CLI/Desktop, PostgreSQL, MongoDB hoặc Kafka server. Vì vậy **chưa chạy Docker Compose, profile PostgreSQL thật và smoke test xuyên service**. Không khẳng định đã xác minh schema PostgreSQL/Flyway, MongoDB index, Kafka delivery, SMTP và luồng Saga end-to-end trong môi trường này.

Thử khởi động PostgreSQL embedded bị sandbox Windows chặn chạy native binary; bản bàn giao dùng profile kết nối PostgreSQL bên ngoài để kiểm tra khi có Docker, không phụ thuộc binary embedded.

Chạy theo README, sau đó:

```powershell
. .\scripts\load-env.ps1
.\mvnw.cmd -pl inventory-service -am -Ppostgres-tests test
node .\scripts\smoke.mjs
```

Chưa đo hiệu năng p95, chạy tải, chaos test hoặc kiểm thử production. Thanh toán là mock; frontend React chưa thuộc phạm vi backend này.
