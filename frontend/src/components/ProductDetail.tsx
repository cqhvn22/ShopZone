"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  Check,
  ChevronRight,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/store-utils.mjs";
import { useStore } from "./StoreProvider";
export function ProductDetail({
  product: p,
  categoryName,
  categorySlug,
  demo,
}: {
  product: Product;
  categoryName: string;
  categorySlug: string;
  demo: boolean;
}) {
  const [selected, setSelected] = useState(
      p.variants.find((v) => v.active)?.sku || "",
    ),
    [qty, setQty] = useState(1),
    [image, setImage] = useState(p.images[0]),
    [tab, setTab] = useState("description");
  const { add, toggleFavorite, favorites } = useStore();
  const router = useRouter();
  const v = p.variants.find((v) => v.sku === selected);
  return (
    <>
      <nav className="breadcrumbs" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={13} />
        <Link href={"/danh-muc/" + categorySlug}>{categoryName}</Link>
        <ChevronRight size={13} />
        <span>{p.name.split(" | ")[0]}</span>
      </nav>
      <section className="product-detail panel">
        <div className="product-detail-title">
          <h1>{p.name}</h1>
          <div>
            <span>
              Thương hiệu:{" "}
              <Link href={"/san-pham?brand=" + encodeURIComponent(p.brand)}>
                {p.brand}
              </Link>
            </span>
            <span className="muted">Mã sản phẩm: {selected}</span>
          </div>
        </div>
        <div className="detail-layout">
          <div className="product-gallery">
            <div className="detail-main-image">
              <Image
                src={image || "/images/product-placeholder.svg"}
                alt={p.name}
                width={510}
                height={440}
                priority
                sizes="(max-width:700px) 90vw, 450px"
              />
            </div>
            <div className="image-thumbnails">
              {p.images.map((src, i) => (
                <button
                  key={src}
                  className={src === image ? "active" : ""}
                  onClick={() => setImage(src)}
                  aria-label={"Xem ảnh sản phẩm " + (i + 1)}
                >
                  <Image
                    src={src}
                    alt={p.name + " — ảnh " + (i + 1)}
                    width={70}
                    height={65}
                  />
                </button>
              ))}
            </div>
            <button
              className={
                "detail-favorite " + (favorites.includes(p.id) ? "active" : "")
              }
              onClick={() => toggleFavorite(p.id)}
            >
              <Heart size={17} />
              {favorites.includes(p.id)
                ? "Đã lưu yêu thích"
                : "Lưu sản phẩm yêu thích"}
            </button>
          </div>
          <div className="buy-box">
            <div className="detail-price-panel">
              <span className="muted">Giá bán</span>
              <div className="detail-price">{money(v?.price || 0)}</div>
              {p.oldPrice && (
                <div>
                  <del>{money(p.oldPrice)}</del>
                  <span className="detail-discount">
                    Tiết kiệm {money(p.oldPrice - Number(v?.price || 0))}
                  </span>
                </div>
              )}
            </div>
            <h2>Chọn phiên bản</h2>
            <div className="variant-options">
              {p.variants.map((variant) => (
                <button
                  key={variant.sku}
                  disabled={!variant.active}
                  className={selected === variant.sku ? "selected" : ""}
                  onClick={() => setSelected(variant.sku)}
                >
                  {Object.values(variant.attributes || {}).join(" · ") ||
                    variant.sku}
                  {selected === variant.sku && <Check size={13} />}
                </button>
              ))}
            </div>
            <div className="detail-stock">
              <Check size={14} />{" "}
              {demo ? "Sản phẩm trong danh mục mẫu" : "Đang được mở bán"}
            </div>
            <div className="quantity-field">
              <span>Số lượng</span>
              <div className="quantity-control">
                <button
                  aria-label="Giảm số lượng"
                  disabled={qty <= 1}
                  onClick={() => setQty(qty - 1)}
                >
                  <Minus size={14} />
                </button>
                <input
                  aria-label="Số lượng sản phẩm"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  max={10000}
                  value={qty}
                  onChange={(e) =>
                    setQty(
                      Math.max(
                        1,
                        Math.min(
                          10000,
                          Math.floor(Number(e.target.value)) || 1,
                        ),
                      ),
                    )
                  }
                />
                <button
                  aria-label="Tăng số lượng"
                  disabled={qty >= 10000}
                  onClick={() => setQty(qty + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="purchase-buttons">
              <button
                className="btn orange"
                disabled={!v?.active}
                onClick={() => {
                  add(p, selected, qty);
                  router.push("/gio-hang");
                }}
              >
                MUA NGAY<small>Chuyển đến giỏ hàng</small>
              </button>
              <button
                className="btn secondary"
                disabled={!v?.active}
                onClick={() => add(p, selected, qty)}
              >
                <ShoppingCart size={21} /> THÊM VÀO GIỎ
              </button>
            </div>
            <div className="purchase-assurances">
              <span>
                <Truck size={19} /> Xem trạng thái giao hàng trong tài khoản
              </span>
              <span>
                <ShieldCheck size={19} /> Giá được xác nhận lại khi đặt hàng
              </span>
            </div>
            {demo && (
              <div className="notice">
                Sản phẩm, thông số và giá minh họa. Bản xem thử chưa tiếp nhận
                đơn hàng thật.
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="detail-information panel">
        <nav className="detail-tabs" aria-label="Thông tin sản phẩm">
          <button
            className={tab === "description" ? "active" : ""}
            onClick={() => setTab("description")}
          >
            Mô tả sản phẩm
          </button>
          <button
            className={tab === "specs" ? "active" : ""}
            onClick={() => setTab("specs")}
          >
            Thông số kỹ thuật
          </button>
        </nav>
        {tab === "description" ? (
          <div className="description-body">
            <h2>{p.name.split(" | ")[0]}</h2>
            <p>{p.description}</p>
            <h3>Lựa chọn phù hợp với nhu cầu của bạn</h3>
            <p>
              Xem kỹ phiên bản, thông số và mức giá. Nếu cần hỗ trợ, hãy tham
              khảo{" "}
              <Link href="/thong-tin/huong-dan-mua-hang">
                hướng dẫn mua hàng
              </Link>{" "}
              trước khi đặt.
            </p>
          </div>
        ) : (
          <table className="spec-table">
            <tbody>
              {Object.entries(p.attributes || {})
                .filter(
                  ([key]) =>
                    !["thương hiệu", "brand"].includes(key.toLowerCase()),
                )
                .map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              <tr>
                <th>Thương hiệu</th>
                <td>{p.brand}</td>
              </tr>
              <tr>
                <th>SKU đã chọn</th>
                <td>{selected}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
