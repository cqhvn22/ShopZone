import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container empty-state page-error">
      <strong>404</strong>
      <h1>Không tìm thấy trang</h1>
      <p>Trang hoặc sản phẩm này không tồn tại hoặc đã ngừng bán.</p>
      <Link className="btn primary" href="/san-pham">
        Tiếp tục mua sắm
      </Link>
    </div>
  );
}
