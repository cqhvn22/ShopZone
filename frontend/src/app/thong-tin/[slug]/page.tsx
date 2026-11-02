import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { seo } from "@/lib/catalog";
const articles: Record<string, { title: string; paragraphs: string[] }> = {
  "gioi-thieu": {
    title: "Về ShopZone",
    paragraphs: [
      "ShopZone là dự án thương mại điện tử dành cho sản phẩm công nghệ: điện thoại, laptop, tai nghe, đồng hồ thông minh và phụ kiện. Website giúp người mua khám phá catalog, chọn phiên bản và theo dõi đơn hàng tại một nơi.",
      "Giao diện được xây theo hướng mua sắm quen thuộc: thông tin dễ tìm, giá rõ ràng và thao tác ngắn gọn. Trong chế độ xem thử, toàn bộ sản phẩm, giá và chương trình hiển thị đều là dữ liệu minh họa.",
      "Thông tin pháp nhân, địa chỉ kinh doanh, thông tin liên hệ và chính sách thương mại chính thức cần được chủ cửa hàng bổ sung trước khi mở bán.",
    ],
  },
  "huong-dan-mua-hang": {
    title: "Hướng dẫn mua hàng",
    paragraphs: [
      "1. Tìm sản phẩm bằng ô tìm kiếm hoặc chọn danh mục. Sử dụng bộ lọc thương hiệu và khoảng giá để thu hẹp lựa chọn.",
      "2. Mở trang chi tiết, xem thông số, chọn phiên bản và số lượng, sau đó thêm sản phẩm vào giỏ hàng.",
      "3. Kiểm tra giỏ hàng, đăng nhập và điền thông tin người nhận. Chọn COD hoặc thanh toán trực tuyến mô phỏng.",
      "4. Gửi đơn hàng và theo dõi trạng thái tại mục Đơn hàng của tôi. Giá cuối cùng được xác nhận từ hệ thống khi tạo đơn; đơn có thể bị hủy nếu không đủ tồn kho.",
      "Trong chế độ xem thử, bạn có thể khám phá sản phẩm và giỏ hàng nhưng không thể tạo đơn hàng thật.",
    ],
  },
  "thanh-toan": {
    title: "Phương thức thanh toán",
    paragraphs: [
      "Thanh toán khi nhận hàng (COD): đơn được xác nhận sau khi giữ hàng thành công. Trạng thái đã thanh toán chỉ được ghi nhận khi giao hàng hoàn tất.",
      "Thanh toán trực tuyến trong dự án hiện là mô phỏng. Đơn chờ thông báo xác thực từ hệ thống thanh toán thử nghiệm; không có giao dịch tiền thật.",
      "ShopZone không yêu cầu nhập số thẻ, mã CVV hoặc mật khẩu ngân hàng trên giao diện này. Không chia sẻ thông tin ngân hàng trong trường địa chỉ hay thông tin người nhận.",
    ],
  },
  "doi-tra": {
    title: "Hủy đơn và đổi trả",
    paragraphs: [
      "Bạn có thể yêu cầu hủy đơn khi trạng thái là Chờ xử lý hoặc Đang chờ thanh toán. Mở Đơn hàng của tôi, chọn đơn cần hủy và nhấn Hủy đơn hàng.",
      "Đơn đã xác nhận, đã thanh toán hoặc đang giao không thể hủy trực tiếp bằng giao diện hiện tại. Dự án chưa triển khai quy trình trả hàng, đổi hàng và hoàn tiền sau khi đơn đã được xác nhận.",
      "Chính sách đổi trả thương mại, thời hạn và điều kiện bảo hành cần được chủ cửa hàng xác nhận và công bố trước khi mở bán.",
    ],
  },
  "bao-mat": {
    title: "Thông tin bảo mật",
    paragraphs: [
      "Phiên đăng nhập dùng cookie HttpOnly để JavaScript phía trình duyệt không đọc trực tiếp access token. Phiên hiện có thời hạn 15 phút; khi hết hạn, bạn cần đăng nhập lại.",
      "Giỏ hàng và danh sách yêu thích được lưu trên trình duyệt đang sử dụng. Dữ liệu này không tự đồng bộ sang thiết bị khác. Bạn có thể xóa bằng các thao tác trong giỏ hàng, danh sách yêu thích hoặc xóa dữ liệu trình duyệt.",
      "Tên, số điện thoại và địa chỉ chỉ được gửi đến hệ thống khi bạn chủ động đặt hàng trong chế độ kết nối backend. Không có thông tin thẻ được thu thập bởi giao diện.",
      "Đây là mô tả kỹ thuật của dự án. Chủ cửa hàng cần bổ sung chính sách bảo vệ dữ liệu, đầu mối liên hệ và cơ chế thực hiện quyền của khách hàng trước khi vận hành thực tế.",
    ],
  },
  "dieu-khoan": {
    title: "Điều khoản sử dụng bản thử nghiệm",
    paragraphs: [
      "Website được cung cấp để trải nghiệm các chức năng của dự án ShopZone. Chế độ xem thử không tiếp nhận đơn hàng hay thanh toán thật.",
      "Giá, tên, thông số và ảnh trong catalog mẫu chỉ phục vụ minh họa giao diện. Không coi dữ liệu mẫu là báo giá hoặc cam kết thương mại.",
      "Khi kết nối backend, trạng thái đơn hàng và dữ liệu tồn kho được quyết định bởi hệ thống. Chỉ thông báo tạo đơn được server tiếp nhận mới là kết quả hợp lệ; giá tạm tính tại giỏ hàng có thể thay đổi.",
      "Điều khoản thương mại và thông tin pháp lý chính thức cần được chủ cửa hàng cập nhật trước khi đưa website vào kinh doanh.",
    ],
  },
  "lien-he": {
    title: "Liên hệ và hỗ trợ",
    paragraphs: [
      "Bạn cần trợ giúp? Bắt đầu với hướng dẫn mua hàng, thông tin thanh toán hoặc tra cứu trạng thái trong mục Đơn hàng của tôi.",
      "Đây là bản triển khai dự án. Thông tin email, hotline và địa chỉ cửa hàng chính thức chưa được cấu hình. Không có số điện thoại hay chứng nhận kinh doanh giả được dùng để minh họa.",
      "Nếu bạn là quản trị viên dự án, hãy cập nhật thông tin liên hệ và các chính sách trước khi mở bán.",
    ],
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles[slug];
  return seo(
    a?.title || "Thông tin",
    a?.paragraphs[0].slice(0, 150) || "Thông tin hỗ trợ ShopZone",
    "/thong-tin/" + slug,
  );
}
export default async function InformationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) notFound();
  return (
    <div className="container inner-page">
      <nav className="breadcrumbs">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={13} />
        <span>{article.title}</span>
      </nav>
      <div className="info-layout">
        <aside className="panel">
          <h2>THÔNG TIN SHOPZONE</h2>
          {Object.entries(articles).map(([key, value]) => (
            <Link
              className={key === slug ? "active" : ""}
              href={"/thong-tin/" + key}
              key={key}
            >
              {value.title}
            </Link>
          ))}
        </aside>
        <article className="panel info-article">
          <h1>{article.title}</h1>
          {article.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <Link className="text-link" href="/san-pham">
            Khám phá sản phẩm →
          </Link>
        </article>
      </div>
    </div>
  );
}
