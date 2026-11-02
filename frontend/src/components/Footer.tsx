import Link from "next/link";
import {
  Truck,
  ShieldCheck,
  Headphones,
  WalletCards,
  Mail,
} from "lucide-react";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="service-row container">
        {[
          [Truck, "Giao hàng thuận tiện", "Theo dõi đơn ngay trên website"],
          [ShieldCheck, "Thông tin rõ ràng", "Thông số và giá được công khai"],
          [
            WalletCards,
            "Thanh toán linh hoạt",
            "COD hoặc thanh toán trực tuyến",
          ],
          [Headphones, "Sẵn sàng hỗ trợ", "Hướng dẫn trong suốt quá trình mua"],
        ].map(([Icon, title, desc]: any) => (
          <div key={title}>
            <Icon size={31} />
            <span>
              <b>{title}</b>
              <small>{desc}</small>
            </span>
          </div>
        ))}
      </div>
      <div className="footer-columns container">
        <div>
          <Link href="/" className="footer-logo">
            Shop<span>Zone</span>
          </Link>
          <p>
            Không gian mua sắm công nghệ dành cho bạn.
            <br />
            Tìm sản phẩm phù hợp, chọn điều mình thích.
          </p>
          <Link className="footer-contact" href="/thong-tin/lien-he">
            <Mail size={16} /> Liên hệ ShopZone
          </Link>
        </div>
        <div>
          <h3>HỖ TRỢ KHÁCH HÀNG</h3>
          <Link href="/thong-tin/huong-dan-mua-hang">Hướng dẫn mua hàng</Link>
          <Link href="/thong-tin/thanh-toan">Phương thức thanh toán</Link>
          <Link href="/don-hang">Tra cứu đơn hàng</Link>
          <Link href="/thong-tin/doi-tra">Chính sách đổi trả</Link>
        </div>
        <div>
          <h3>VỀ SHOPZONE</h3>
          <Link href="/thong-tin/gioi-thieu">Giới thiệu ShopZone</Link>
          <Link href="/thong-tin/bao-mat">Chính sách bảo mật</Link>
          <Link href="/thong-tin/dieu-khoan">Điều khoản sử dụng</Link>
          <Link href="/thong-tin/lien-he">Liên hệ</Link>
        </div>
        <div>
          <h3>PHƯƠNG THỨC THANH TOÁN</h3>
          <div className="payment-brands">
            <span>COD</span>
            <span>VISA</span>
            <span>Mastercard</span>
          </div>
          <p className="muted">
            Cổng thanh toán trực tuyến hiện ở chế độ mô phỏng.
          </p>
          <h3>MUA SẮM CÙNG SHOPZONE</h3>
          <Link href="/san-pham">Khám phá tất cả sản phẩm →</Link>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>
          © {new Date().getFullYear()} ShopZone. Dự án thương mại điện tử.
        </span>
        <span>Giá hiển thị bằng Việt Nam Đồng (VND).</span>
      </div>
    </footer>
  );
}
