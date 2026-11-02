# ShopZone Storefront

Giao diện TMĐT phong cách 2022: header xanh, tìm kiếm lớn, danh mục bên trái, banner khuyến mãi, lưới sản phẩm, giá nổi bật và footer nhiều thông tin. Dùng Next.js App Router + React + TypeScript; không phải SPA chỉ render sau khi tải JavaScript.

## Chạy giao diện

Cần Node.js **20.9+**, khuyến nghị Node 22 LTS. Tại thư mục `frontend`:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Mở http://localhost:3000. Nếu `.env.local` đã tồn tại, giữ nguyên file đó thay vì chép đè. Cấu hình mẫu mặc định gọi backend thật; để xem riêng giao diện khi chưa chạy backend, đổi `SHOPZONE_DATA_MODE=demo`.

```powershell
npm run typecheck
npm test
npm run build
npm start
```

`npm run test:smoke` cần một server giao diện đang chạy ở localhost:3000 với chế độ demo. Có thể đổi URL qua biến `FRONTEND_URL`.

`npm run test:contract` chạy bản production đã build tại cổng thử nghiệm 3001, dùng một HTTP backend stub riêng tại 18088 và tự dừng khi xong. Nó kiểm tra cookie, Origin, chuyển tiếp JWT, Idempotency-Key, schema/robots và quyền API; không tạo đơn hàng Spring Boot thật. Để trống hai cổng này trước khi chạy.

Trong phiên làm việc này, thư viện được cài bằng npm với `--bin-links=false` vì sandbox Windows hạn chế symlink. Các npm scripts dùng đường dẫn Node trực tiếp nên vẫn hoạt động. Không cần dùng cấu hình này trên máy thông thường. Next.js standalone được dùng trong Docker Linux; Windows build dùng `next start` để tránh quyền tạo symlink.

Windows build dùng một worker và giữ thư mục build để tránh lỗi tạo thư mục đồng thời trong sandbox. Khi đổi cấu trúc route lớn, có thể xóa thư mục `.next` cục bộ rồi build lại trong terminal thông thường. Bản Docker Linux dùng quy trình clean build và standalone mặc định.

## Hai chế độ dữ liệu

`SHOPZONE_DATA_MODE=demo`: có sẵn 18 sản phẩm và ảnh lưu cục bộ. Tìm kiếm, bộ lọc, sắp xếp, yêu thích, giỏ hàng, chọn phiên bản, số lượng và form hoạt động. Không giả lập đăng nhập thành công, tạo đơn hoặc thanh toán. Một nhãn ở đầu trang cho biết đây là bản xem thử; robots và metadata chặn index dữ liệu mẫu.

`SHOPZONE_DATA_MODE=backend`: lấy sản phẩm, danh mục, tài khoản và đơn từ Spring Boot Gateway. Không tự thay dữ liệu lỗi bằng catalog mẫu. Nếu chưa kết nối được backend, hiển thị thông báo rõ ràng.

```dotenv
SHOPZONE_DATA_MODE=backend
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=https://ten-mien-thuc-te.example
```

`NEXT_PUBLIC_SITE_URL` phải là origin thật khi đưa lên production; nó quyết định canonical, sitemap, Open Graph và JSON-LD. Build lại khi đổi tên miền. Dùng HTTPS khi công khai website.

Chạy đầy đủ Docker từ thư mục `shopzone`: `docker compose up --build -d --wait --wait-timeout 600`. Giao diện tại cổng 3000, BFF gọi Gateway qua mạng Docker. Backend không cần bật CORS cho cổng 3000 vì trình duyệt gọi API cùng origin của frontend.

Để khởi động backend và nạp đủ dữ liệu phát triển, chạy `powershell -ExecutionPolicy Bypass -File ..\scripts\connect-database.ps1 -HostFrontend`, rồi khởi động lại frontend nếu trước đó dùng demo. Script tạo catalog, khách hàng, đơn COD và kiểm tra trực tiếp PostgreSQL/MongoDB. Nếu chỉ cần catalog khi backend đã chạy, dùng `node scripts/seed-catalog.mjs` tại thư mục frontend. Script đọc tài khoản admin từ `.env` của backend, tạo catalog mẫu và nhập 30 sản phẩm cho mỗi SKU chưa có bản ghi tồn kho; giữ nguyên tồn kho đã có. Chỉ sử dụng với database phát triển của dự án; script không tự chạy khi mở website.

## Trang và chức năng

| Đường dẫn | Chức năng |
| --- | --- |
| `/` | Trang chủ, banner có thể chuyển, nhóm sản phẩm |
| `/san-pham` | Tìm kiếm, thương hiệu, khoảng giá, sắp xếp |
| `/danh-muc/[slug]` | Trang danh mục riêng |
| `/san-pham/[slug]` | Ảnh, phiên bản, số lượng, thông số, giỏ hàng |
| `/yeu-thich` | Danh sách sản phẩm đã lưu trên trình duyệt |
| `/gio-hang` | Tăng giảm số lượng, xóa, tổng tạm tính |
| `/thanh-toan` | Địa chỉ, COD / ONLINE mock, tạo đơn bằng Idempotency-Key |
| `/dang-nhap`, `/dang-ky` | Kết nối Auth Service qua BFF |
| `/don-hang`, `/don-hang/[id]` | Lịch sử, trạng thái, hủy PENDING/RESERVED, polling |
| `/quan-tri` | Dashboard, CRUD sản phẩm/danh mục, tồn kho, đơn, khóa/mở tài khoản |
| `/thong-tin/[slug]` | Giới thiệu, hướng dẫn, thanh toán, bảo mật, điều khoản, liên hệ |

Admin yêu cầu tài khoản có vai trò ADMIN. Backend kiểm tra quyền cho từng API; ẩn nút ở frontend không thay thế phân quyền backend. Danh sách quản trị và catalog hiện lấy tối đa 100 bản ghi cho bản dự án này; cần bổ sung phân trang server và API lookup theo slug nếu phát triển catalog lớn hơn.

Giỏ hàng/yêu thích được giữ trong localStorage của trình duyệt. Đây là giỏ khách trên storefront, không tự đồng bộ với bảng cart trong Order Service. Checkout gửi các SKU và quantity đã chọn; Spring Boot tính lại giá và giữ kho. Không tin cậy tổng tiền phía trình duyệt. Giỏ chỉ xóa sau khi server nhận đơn thành công; key được giữ cho retry cùng payload để tránh tạo đơn trùng.

## Bảo mật và SEO

- Token chỉ nằm trong cookie HttpOnly, SameSite=Lax, hết hạn sau 15 phút; không trả accessToken cho JavaScript hoặc lưu trong localStorage.
- BFF có whitelist endpoint, kiểm tra Origin cho thay đổi dữ liệu và không cho trình duyệt gọi callback thanh toán. Không đưa JWT_SECRET hoặc PAYMENT_CALLBACK_SECRET vào frontend.
- Nội dung catalog có trong HTML server-rendered; metadata/canonical/OG riêng theo trang, `lang=vi`, một H1 chính, breadcrumb và Product JSON-LD.
- Không tạo đánh giá, số sao, số lượng đã bán hoặc chứng nhận kinh doanh giả. Demo không phát schema Offer; backend chỉ phát giá thật và không khai InStock khi chưa biết tồn kho.
- Trang giao dịch, tài khoản, quản trị, yêu thích và trang lọc/tìm kiếm không index. Sitemap chỉ đưa URL catalog canonical trong chế độ backend.
- Proxy kiểm tra tồn tại trước khi streaming, để sản phẩm/danh mục không tồn tại trả đúng HTTP 404; lỗi kết nối catalog trả 503.
- Ảnh có kích thước và alt, dùng Next Image với lazy loading cho nội dung dưới màn hình. Font hệ thống, không phụ thuộc dịch vụ font ngoài.
- Có skip link, focus hiển thị, tên nút, hỗ trợ reduced motion và form label.

Đây là nền tảng SEO kỹ thuật, không phải cam kết vị trí tìm kiếm hay điểm Core Web Vitals đã được đo. Cần đăng ký Search Console, nội dung thương mại thật và kiểm tra structured data trên tên miền triển khai trước khi mở bán.

## Ảnh và dữ liệu mẫu

Ảnh sản phẩm lấy từ [DummyJSON](https://dummyjson.com/products), tải về `public/images/products/`. File `public/images/ASSET-SOURCES.json` lưu URL nguồn. Tên, cấu hình và giá Việt Nam được biên soạn để minh họa, không phải dữ liệu bán hàng được xác nhận. Kiểm tra quyền sử dụng và thay ảnh được cấp phép trước khi kinh doanh thực tế.

Thông tin doanh nghiệp, hotline, bảo hành và chính sách đổi trả chính thức chưa được bịa để lấp chỗ trống. Các trang hỗ trợ ghi rõ phần nào cần cấu hình trước khi mở bán.
