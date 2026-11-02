"use client";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { useStore } from "./StoreProvider";
import { cartTotal, money } from "@/lib/store-utils.mjs";
export function CartView() {
  const { cart, quantity, ready } = useStore();
  return (
    <div className="container inner-page">
      <nav className="breadcrumbs">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={13} />
        <span>Giỏ hàng</span>
      </nav>
      <div className="page-heading">
        <h1>GIỎ HÀNG CỦA BẠN</h1>
        <span>{cart.reduce((n, x) => n + x.quantity, 0)} sản phẩm</span>
      </div>
      {!ready ? (
        <div className="loading-state">Đang tải giỏ hàng…</div>
      ) : !cart.length ? (
        <div className="empty-state">
          <ShoppingCart size={60} />
          <h2>Giỏ hàng của bạn đang trống</h2>
          <p>Chọn thêm sản phẩm yêu thích để bắt đầu mua sắm nhé!</p>
          <Link className="btn primary" href="/san-pham">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="two-column">
          <section>
            <div className="cart-table">
              <div className="cart-table-head">
                <span>Sản phẩm</span>
                <span>Đơn giá</span>
                <span>Số lượng</span>
                <span>Thành tiền</span>
              </div>
              {cart.map((line) => (
                <article className="cart-line" key={line.sku}>
                  <div className="cart-product">
                    <Link href={"/san-pham/" + line.slug}>
                      <Image
                        src={line.image || "/images/product-placeholder.svg"}
                        alt={line.name}
                        width={95}
                        height={95}
                      />
                    </Link>
                    <div>
                      <Link href={"/san-pham/" + line.slug}>{line.name}</Link>
                      <small>SKU: {line.sku}</small>
                      <button
                        className="remove-line"
                        onClick={() => quantity(line.sku, 0)}
                        aria-label={"Xóa " + line.name}
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </div>
                  <div className="cart-unit-price">{money(line.price)}</div>
                  <div className="quantity-control">
                    <button
                      aria-label={"Giảm số lượng " + line.name}
                      disabled={line.quantity <= 1}
                      onClick={() => quantity(line.sku, line.quantity - 1)}
                    >
                      <Minus size={13} />
                    </button>
                    <span aria-live="polite">{line.quantity}</span>
                    <button
                      aria-label={"Tăng số lượng " + line.name}
                      disabled={line.quantity >= 10000}
                      onClick={() => quantity(line.sku, line.quantity + 1)}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <b className="cart-line-total">
                    {money(line.price * line.quantity)}
                  </b>
                </article>
              ))}
            </div>
            <Link className="continue-shopping" href="/san-pham">
              <ArrowLeft size={15} /> Tiếp tục mua sắm
            </Link>
          </section>
          <aside className="summary">
            <h2>Thông tin đơn hàng</h2>
            <div className="summary-row">
              <span>Tạm tính</span>
              <b>{money(cartTotal(cart))}</b>
            </div>
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <span>Xác nhận khi đặt hàng</span>
            </div>
            <div className="summary-row total">
              <span>Tổng tạm tính</span>
              <b>{money(cartTotal(cart))}</b>
            </div>
            <small>Giá cuối cùng được xác nhận từ cửa hàng khi đặt hàng.</small>
            <Link className="btn orange" href="/thanh-toan">
              TIẾN HÀNH ĐẶT HÀNG
            </Link>
            <div className="security-note">
              <ShieldCheck size={16} /> Thông tin của bạn được bảo vệ
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
