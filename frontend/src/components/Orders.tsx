"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ChevronRight, CheckCircle2 } from "lucide-react";
import { useStore } from "./StoreProvider";
import { money, orderLabel } from "@/lib/store-utils.mjs";
import type { Order } from "@/lib/types";
export function Orders({ id }: { id?: string }) {
  const { user, ready, notify } = useStore();
  const [orders, setOrders] = useState<Order[]>([]),
    [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch(
      "/api/shop/orders" + (id ? "/" + encodeURIComponent(id) : ""),
      { cache: "no-store" },
    );
    const data = await response.json();
    if (!response.ok)
      throw Error(
        response.status === 401
          ? "Phiên đăng nhập đã hết hạn."
          : response.status === 404
            ? "Không tìm thấy đơn hàng này."
            : data.detail || "Chưa tải được đơn hàng.",
      );
    if (id) setOrder(data);
    else setOrders(data.content || []);
    setLoading(false);
    setError("");
  }
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let stopped = false;
    const update = () => {
      if (document.visibilityState === "hidden") return;
      void load().catch((e) => {
        if (!stopped) {
          setError(e.message);
          setLoading(false);
        }
      });
    };
    update();
    const timer = id ? setInterval(update, 4000) : null;
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, [user, id]);
  async function cancel() {
    if (!id || !window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/shop/orders/" + id + "/cancel", {
        method: "POST",
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.detail || "Chưa thể hủy đơn hàng.");
      setOrder(body);
      notify("Đã gửi yêu cầu hủy đơn hàng");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <div className="loading-state">Đang tải…</div>;
  if (!user)
    return (
      <div className="container inner-page">
        <div className="empty-state">
          <Package size={55} />
          <h1>Đơn hàng của bạn</h1>
          <p>Đăng nhập để xem trạng thái và lịch sử mua hàng.</p>
          <Link
            className="btn primary"
            href={
              "/dang-nhap?next=" +
              encodeURIComponent(id ? "/don-hang/" + id : "/don-hang")
            }
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  return (
    <div className="container inner-page">
      <nav className="breadcrumbs">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={13} />
        <Link href="/don-hang">Đơn hàng của tôi</Link>
        {id && (
          <>
            <ChevronRight size={13} />
            <span>Chi tiết đơn</span>
          </>
        )}
      </nav>
      <div className="page-heading">
        <h1>{id ? "CHI TIẾT ĐƠN HÀNG" : "ĐƠN HÀNG CỦA TÔI"}</h1>
        <Link className="text-link" href="/san-pham">
          Tiếp tục mua sắm →
        </Link>
      </div>
      {error && (
        <div className="error-notice" role="alert">
          {error}{" "}
          <button
            className="text-link"
            onClick={() => void load().catch((e) => setError(e.message))}
          >
            Thử lại
          </button>
        </div>
      )}
      {loading ? (
        <div className="loading-state">Đang tải đơn hàng…</div>
      ) : id && order ? (
        <>
          <section className="panel order-detail-panel">
            <div className="order-detail-top">
              <div>
                <h2>{order.orderCode}</h2>
                <p className="muted">
                  Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <span className={"status-badge " + order.status.toLowerCase()}>
                {orderLabel(order.status)}
              </span>
            </div>
            {["PENDING", "RESERVED"].includes(order.status) && (
              <div className="notice">
                {order.paymentMethod === "ONLINE"
                  ? "Đơn đang chờ kết quả từ cổng thanh toán mô phỏng. Không cần gửi thông tin thẻ trên giao diện này."
                  : "Hệ thống đang kiểm tra tồn kho và xác nhận đơn hàng."}
              </div>
            )}
            <div className="order-address">
              <h3>Địa chỉ giao hàng</h3>
              <b>{order.shippingAddress.recipient}</b>
              <p>
                {order.shippingAddress.phone}
                <br />
                {[order.shippingAddress.address, order.shippingAddress.ward, order.shippingAddress.city].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="order-items">
              {order.items.map((item) => (
                <div key={item.sku}>
                  <span>
                    {item.productName}
                    <small>
                      {item.sku} · Số lượng {item.quantity}
                    </small>
                  </span>
                  <b>{money(item.subtotal)}</b>
                </div>
              ))}
            </div>
            <div className="order-total">
              <span>
                Phương thức:{" "}
                {order.paymentMethod === "COD"
                  ? "Thanh toán khi nhận hàng"
                  : "Trực tuyến (mô phỏng)"}
              </span>
              <b>
                Tổng tiền: <strong>{money(order.totalAmount)}</strong>
              </b>
            </div>
            {["PENDING", "RESERVED"].includes(order.status) && (
              <button className="btn danger" onClick={cancel} disabled={busy}>
                {busy ? "Đang hủy…" : "Hủy đơn hàng"}
              </button>
            )}
          </section>
          <section className="panel order-history">
            <h2>Lịch sử xử lý</h2>
            {order.history.map((h, i) => (
              <div className="history-step" key={i}>
                <CheckCircle2 size={19} />
                <span>
                  <b>{orderLabel(h.newStatus)}</b>
                  <small>{new Date(h.changedAt).toLocaleString("vi-VN")}</small>
                </span>
              </div>
            ))}
          </section>
        </>
      ) : !id ? (
        <>
          <div className="order-filters">
            {[
              ["all", "Tất cả đơn"],
              ["PENDING", "Chờ xử lý"],
              ["SHIPPING", "Đang giao"],
              ["COMPLETED", "Hoàn thành"],
              ["CANCELLED", "Đã hủy"],
            ].map(([value, label]) => (
              <button
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>
          {orders.filter((o) => filter === "all" || o.status === filter)
            .length ? (
            orders
              .filter((o) => filter === "all" || o.status === filter)
              .map((o) => (
                <article className="order-card panel" key={o.id}>
                  <div className="order-card-head">
                    <b>{o.orderCode}</b>
                    <span className={"status-badge " + o.status.toLowerCase()}>
                      {orderLabel(o.status)}
                    </span>
                  </div>
                  {o.items.slice(0, 2).map((i) => (
                    <div className="order-line" key={i.sku}>
                      <span>
                        {i.productName} <small>×{i.quantity}</small>
                      </span>
                      <b>{money(i.subtotal)}</b>
                    </div>
                  ))}
                  <div className="order-card-bottom">
                    <span>
                      {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                    <b>{money(o.totalAmount)}</b>
                    <Link className="btn secondary" href={"/don-hang/" + o.id}>
                      Xem chi tiết
                    </Link>
                  </div>
                </article>
              ))
          ) : (
            <div className="empty-state">
              <Package size={50} />
              <h2>Chưa có đơn hàng trong mục này</h2>
              <p>Các đơn hàng của bạn sẽ được hiển thị tại đây.</p>
              <Link href="/san-pham" className="btn primary">
                Khám phá sản phẩm
              </Link>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
