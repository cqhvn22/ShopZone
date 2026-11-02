"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  MapPin,
  WalletCards,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useStore } from "./StoreProvider";
import { cartTotal, money } from "@/lib/store-utils.mjs";
export function Checkout({ demo }: { demo: boolean }) {
  const { cart, user, ready, clear } = useStore();
  const router = useRouter();
  const [method, setMethod] = useState("COD"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const retry = useRef<{ fingerprint: string; key: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (demo || !user) return;
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const body = {
      items: cart.map((l) => ({ sku: l.sku, quantity: l.quantity })),
      paymentMethod: method,
      shippingAddress: {
        recipient: String(form.get("recipient")).trim(),
        phone: String(form.get("phone")).trim(),
        address: String(form.get("address")).trim(),
        city: String(form.get("city")).trim(),
      },
    };
    const fingerprint = JSON.stringify(body);
    if (retry.current?.fingerprint !== fingerprint)
      retry.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const r = await fetch("/api/shop/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": retry.current.key,
        },
        body: fingerprint,
      });
      const result = await r.json();
      if (!r.ok)
        throw Error(
          r.status === 401
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            : result.detail ||
                "Chưa thể đặt hàng. Vui lòng kiểm tra lại giỏ hàng.",
        );
      clear();
      router.push("/don-hang/" + result.id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Đặt hàng chưa thành công. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <div className="container loading-state">
        Đang tải thông tin đặt hàng…
      </div>
    );
  if (!cart.length)
    return (
      <div className="container inner-page">
        <div className="empty-state">
          <ShoppingBag size={50} />
          <h1>Chưa có sản phẩm để thanh toán</h1>
          <p>Hãy chọn sản phẩm trước khi đặt hàng.</p>
          <Link className="btn primary" href="/san-pham">
            Mua sắm ngay
          </Link>
        </div>
      </div>
    );
  return (
    <div className="container inner-page">
      <nav className="breadcrumbs">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={13} />
        <Link href="/gio-hang">Giỏ hàng</Link>
        <ChevronRight size={13} />
        <span>Thanh toán</span>
      </nav>
      <div className="page-heading">
        <h1>THÔNG TIN ĐẶT HÀNG</h1>
      </div>
      {demo ? (
        <div className="notice checkout-notice">
          Chế độ xem thử: bạn có thể điền thử thông tin, nhưng không tạo đơn hay
          thực hiện thanh toán thật.
        </div>
      ) : (
        !user && (
          <div className="notice checkout-notice">
            Vui lòng{" "}
            <Link className="text-link" href="/dang-nhap?next=%2Fthanh-toan">
              đăng nhập
            </Link>{" "}
            để đặt hàng và theo dõi đơn của bạn.
          </div>
        )
      )}
      <form onSubmit={submit} className="two-column">
        <section>
          <div className="panel checkout-address">
            <h2>
              <MapPin size={19} /> Địa chỉ nhận hàng
            </h2>
            <div className="form-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="recipient">
                  Họ và tên người nhận
                </label>
                <input
                  id="recipient"
                  name="recipient"
                  required
                  maxLength={150}
                  defaultValue={user?.fullName}
                  autoComplete="shipping name"
                  placeholder="Nhập họ và tên"
                />
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="shipping-phone">
                  Số điện thoại
                </label>
                <input
                  id="shipping-phone"
                  name="phone"
                  required
                  maxLength={20}
                  type="tel"
                  autoComplete="shipping tel"
                  placeholder="Số điện thoại nhận hàng"
                />
              </div>
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="city">
                Tỉnh / Thành phố
              </label>
              <select
                id="city"
                name="city"
                required
                autoComplete="shipping address-level1"
              >
                <option value="">Chọn tỉnh / thành phố</option>
                {[
                  "TP. Hồ Chí Minh",
                  "Hà Nội",
                  "Đà Nẵng",
                  "Cần Thơ",
                  "Hải Phòng",
                  "An Giang",
                  "Bắc Ninh",
                  "Cà Mau",
                  "Cao Bằng",
                  "Đắk Lắk",
                  "Điện Biên",
                  "Đồng Nai",
                  "Đồng Tháp",
                  "Gia Lai",
                  "Hà Tĩnh",
                  "Hưng Yên",
                  "Khánh Hòa",
                  "Lai Châu",
                  "Lâm Đồng",
                  "Lạng Sơn",
                  "Lào Cai",
                  "Nghệ An",
                  "Ninh Bình",
                  "Phú Thọ",
                  "Quảng Ngãi",
                  "Quảng Ninh",
                  "Quảng Trị",
                  "Sơn La",
                  "Tây Ninh",
                  "Thái Nguyên",
                  "Thanh Hóa",
                  "Huế",
                  "Tuyên Quang",
                  "Vĩnh Long",
                ]
                  .sort((a, b) => a.localeCompare(b, "vi"))
                  .map((x) => (
                    <option key={x}>{x}</option>
                  ))}
              </select>
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="address">
                Địa chỉ chi tiết
              </label>
              <textarea
                id="address"
                name="address"
                required
                maxLength={500}
                rows={3}
                autoComplete="shipping street-address"
                placeholder="Số nhà, tên đường, phường / xã…"
              />
            </div>
          </div>
          <div className="panel payment-method-panel">
            <h2>
              <WalletCards size={20} /> Phương thức thanh toán
            </h2>
            <label
              className={
                "payment-choice " + (method === "COD" ? "selected" : "")
              }
            >
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={method === "COD"}
                onChange={() => setMethod("COD")}
              />
              <div>
                <b>Thanh toán khi nhận hàng (COD)</b>
                <small>Thanh toán sau khi nhận được sản phẩm.</small>
              </div>
            </label>
            <label
              className={
                "payment-choice " + (method === "ONLINE" ? "selected" : "")
              }
            >
              <input
                type="radio"
                name="paymentMethod"
                value="ONLINE"
                checked={method === "ONLINE"}
                onChange={() => setMethod("ONLINE")}
              />
              <div>
                <b>Thanh toán trực tuyến — Mô phỏng</b>
                <small>
                  Đơn chờ callback xác thực từ cổng mô phỏng. Không giao dịch
                  tiền thật.
                </small>
              </div>
            </label>
          </div>
        </section>
        <aside className="summary checkout-summary">
          <h2>
            Đơn hàng ({cart.reduce((n, x) => n + x.quantity, 0)} sản phẩm)
          </h2>
          {cart.map((line) => (
            <div className="checkout-product" key={line.sku}>
              <Image src={line.image} alt={line.name} width={48} height={48} />
              <div>
                <span>{line.name}</span>
                <small>Số lượng: {line.quantity}</small>
                <b>{money(line.price * line.quantity)}</b>
              </div>
            </div>
          ))}
          <div className="summary-row">
            <span>Tạm tính</span>
            <b>{money(cartTotal(cart))}</b>
          </div>
          <div className="summary-row">
            <span>Phí vận chuyển</span>
            <span>0 ₫</span>
          </div>
          <div className="summary-row total">
            <span>Tổng tạm tính</span>
            <b>{money(cartTotal(cart))}</b>
          </div>
          <small>
            Giá cuối cùng được hệ thống xác nhận khi tạo đơn. Phiên bản hiện tại
            chưa tính phí giao hàng.
          </small>
          {error && (
            <div className="error-notice" role="alert">
              {error}
            </div>
          )}
          <button
            className="btn orange full"
            type="submit"
            disabled={busy || demo || !user}
          >
            {busy
              ? "ĐANG GỬI ĐƠN…"
              : demo
                ? "BẢN XEM THỬ — CHƯA MỞ BÁN"
                : "ĐẶT HÀNG"}
          </button>
          <p className="checkout-terms">
            Đặt hàng đồng nghĩa với việc bạn đồng ý với{" "}
            <Link href="/thong-tin/dieu-khoan">điều khoản sử dụng</Link>.
          </p>
          <div className="security-note">
            <ShieldCheck size={15} /> Không thu thập thông tin thẻ ngân hàng
          </div>
        </aside>
      </form>
    </div>
  );
}
