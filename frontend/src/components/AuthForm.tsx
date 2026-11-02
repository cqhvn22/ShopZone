"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShoppingBag, ShieldCheck } from "lucide-react";
import { useStore } from "./StoreProvider";
import { safeReturn } from "@/lib/store-utils.mjs";
export function AuthForm({
  register = false,
  demo,
}: {
  register?: boolean;
  demo: boolean;
}) {
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter(),
    search = useSearchParams();
  const { refreshSession } = useStore();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (demo) {
      setError(
        "Bản xem thử chưa kết nối tài khoản thật. Bạn vẫn có thể xem sản phẩm và trải nghiệm giỏ hàng.",
      );
      return;
    }
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email")).trim(),
      password = String(data.get("password"));
    if (new TextEncoder().encode(password).length > 72) {
      setError(
        "Mật khẩu tối đa 72 byte UTF-8. Vui lòng dùng mật khẩu ngắn hơn.",
      );
      return;
    }
    setBusy(true);
    try {
      if (register) {
        const r = await fetch("/api/shop/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            fullName: data.get("fullName"),
            phone: data.get("phone") || null,
          }),
        });
        if (!r.ok) {
          const b = await r.json();
          throw Error(
            r.status === 409
              ? "Email này đã được đăng ký. Vui lòng đăng nhập."
              : b.detail || "Chưa tạo được tài khoản.",
          );
        }
      }
      const r = await fetch("/api/shop/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok)
        throw Error(
          r.status === 401
            ? "Email hoặc mật khẩu chưa đúng, hoặc tài khoản đã bị khóa."
            : "Chưa kết nối được cửa hàng. Vui lòng thử lại.",
        );
      await refreshSession();
      router.replace(safeReturn(search.get("next")));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container auth-page">
      <section className="auth-intro">
        <span className="auth-intro-icon">
          <ShoppingBag size={51} />
        </span>
        <h1>
          {register ? "Chào mừng bạn đến ShopZone" : "Mua sắm dễ dàng hơn"}
        </h1>
        <p>
          Tìm món đồ bạn thích.
          <br />
          Theo dõi đơn hàng thật tiện lợi.
        </p>
        <div>
          <ShieldCheck size={18} /> Thông tin tài khoản được bảo vệ
        </div>
      </section>
      <section className="auth-panel">
        <h2>{register ? "Tạo tài khoản mới" : "Đăng nhập"}</h2>
        <p>
          {register
            ? "Đăng ký để quản lý đơn hàng của bạn."
            : "Chào bạn, hãy đăng nhập để tiếp tục."}
        </p>
        {demo && (
          <div className="notice">
            Bạn đang xem bản giao diện mẫu. Tài khoản và giao dịch thật chưa
            được kết nối.
          </div>
        )}
        <form onSubmit={submit}>
          {register && (
            <div className="form-field">
              <label className="field-label" htmlFor="fullName">
                Họ và tên
              </label>
              <input
                required
                id="fullName"
                name="fullName"
                maxLength={150}
                autoComplete="name"
                placeholder="Nhập họ và tên"
              />
            </div>
          )}
          <div className="form-field">
            <label className="field-label" htmlFor="email">
              Địa chỉ email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              maxLength={255}
              autoComplete="email"
              placeholder="Nhập email của bạn"
            />
          </div>
          {register && (
            <div className="form-field">
              <label className="field-label" htmlFor="phone">
                Số điện thoại <span className="muted">(không bắt buộc)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                maxLength={20}
                autoComplete="tel"
                placeholder="Số điện thoại liên hệ"
              />
            </div>
          )}
          <div className="form-field">
            <label className="field-label" htmlFor="password">
              Mật khẩu
            </label>
            <div className="password-field">
              <input
                id="password"
                type={show ? "text" : "password"}
                name="password"
                required
                minLength={register ? 12 : 1}
                maxLength={72}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={register ? "Ít nhất 12 ký tự" : "Nhập mật khẩu"}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {register && (
            <label className="terms-check">
              <input type="checkbox" required />{" "}
              <span>
                Tôi đồng ý với{" "}
                <Link href="/thong-tin/dieu-khoan">điều khoản sử dụng</Link> và{" "}
                <Link href="/thong-tin/bao-mat">chính sách bảo mật</Link>.
              </span>
            </label>
          )}
          {error && (
            <div className="error-notice" role="alert">
              {error}
            </div>
          )}
          <button className="btn primary full" disabled={busy} type="submit">
            {busy
              ? "Đang xử lý…"
              : register
                ? "ĐĂNG KÝ TÀI KHOẢN"
                : "ĐĂNG NHẬP"}
          </button>
        </form>
        <div className="auth-switch">
          {register ? "Bạn đã có tài khoản?" : "Bạn chưa có tài khoản?"}{" "}
          <Link
            href={
              (register ? "/dang-nhap" : "/dang-ky") +
              (search.get("next")
                ? "?next=" + encodeURIComponent(safeReturn(search.get("next")))
                : "")
            }
          >
            {register ? "Đăng nhập" : "Đăng ký ngay"}
          </Link>
        </div>
        <Link className="auth-back" href="/san-pham">
          ← Tiếp tục khám phá sản phẩm
        </Link>
      </section>
    </div>
  );
}
