# Kiểm thử

```powershell
.\mvnw.cmd clean verify
```

Các test chạy không cần Docker:

- SecurityContractTest: guest browse, JWT bắt buộc cho order, customer bị chặn tạo sản phẩm, admin được phép, internal bị khóa.
- AuthServiceTest: email chuẩn hóa, BCrypt, chỉ cấp CUSTOMER, email trùng, tài khoản LOCKED không đăng nhập.
- CatalogRulesTest: SKU lặp trong cùng product và variant ngừng bán.
- OrderRulesTest: giá snapshot/tổng tiền, quantity dương, state machine, COD không tự PAID.
- OrderSagaTest: chỉ phát PaymentRequested một lần, event trùng, COD và callback thành công đến sau hủy.
- InventoryTransactionsTest: chạy SQL trên H2 PostgreSQL mode, 20 khách đồng thời tranh 10 sản phẩm, thiếu hàng, multi-SKU thất bại, commit/release lặp, cancel đến sớm, rollback processed event cùng nghiệp vụ.
- CallbackSignerTest: chữ ký ràng buộc amount/order/currency/status, từ chối chữ ký thiếu hoặc sai.
- GatewayRoutingTest: khởi động Gateway thật, chuyển tiếp tới HTTP server test, chặn request order chưa xác thực và health readiness.
- OrderPersistenceTest: lưu/đọc snapshot giá, địa chỉ JSON và lịch sử bằng Hibernate trên H2 PostgreSQL mode.

H2 dùng cho transaction và cạnh tranh kho; không thay thế kiểm thử dialect/khóa trên PostgreSQL thật hoặc delivery Kafka. Các test PostgreSQL/Flyway thực tế và luồng Saga xuyên service được kiểm tra bằng môi trường Docker và smoke script dưới đây.

Profile tùy chọn kiểm tra PostgreSQL thật, cần khởi động container `postgres` trước:

```powershell
. .\scripts\load-env.ps1
.\mvnw.cmd -pl inventory-service -am -Ppostgres-tests test
```

Profile chạy lại 7 tình huống kho bằng PostgreSQL thật và chạy migration của cả 5 service quan hệ. Test tạo database tên `test_<uuid>` riêng biệt và xóa các database do chính nó tạo khi kết thúc; không dùng database nghiệp vụ. Cần user postgres có quyền tạo database. `TEST_POSTGRES_URL` mặc định `jdbc:postgresql://localhost:5432/postgres`, mật khẩu lấy từ POSTGRES_PASSWORD trong `.env`.

```powershell
docker compose up --build -d --wait --wait-timeout 600
node .\scripts\smoke.mjs
```

| FLOW | Bằng chứng kiểm tra |
| --- | --- |
| TC01 đăng ký | AuthServiceTest và smoke |
| TC02 email trùng 409 | AuthServiceTest và smoke |
| TC03 admin tạo sản phẩm | SecurityContractTest và smoke với MongoDB thật |
| TC04 customer tạo sản phẩm 403 | SecurityContractTest và smoke |
| TC05 mua 2 khi tồn 10 | InventoryTransactionsTest và smoke |
| TC06 mua 15 khi tồn 10 | InventoryTransactionsTest và smoke |
| TC07 payment failed hoàn kho | InventoryTransactionsTest và smoke |
| TC08 event trùng | InventoryTransactionsTest, OrderSagaTest; smoke còn gửi callback trùng |
| TC09 client giá giả | OrderRulesTest và smoke: payload lạ bị 400, tổng giá server được kiểm tra |
| TC10 đơn người khác | smoke yêu cầu bằng token khách thứ hai, mong đợi 404 |

Kiểm tra phục hồi thủ công: dừng Kafka, tạo đơn để quan sát PENDING và outbox chưa published; khởi động Kafka, theo dõi Saga tiếp tục. Dừng Notification Service rồi đặt đơn; order vẫn hoàn tất, thông báo được nhận sau khi service trở lại. Dừng Mailpit, kiểm tra email retry và đơn không đổi trạng thái. Thực hiện trên dữ liệu demo.

Chưa có benchmark tải, đo p95, kiểm thử cổng thanh toán thật hoặc tính sẵn sàng của cluster nhiều broker. Kết quả đã chạy được ghi riêng trong `verification.md`; không coi việc có test script là bằng chứng test đã chạy.
