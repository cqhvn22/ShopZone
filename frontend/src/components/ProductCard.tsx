"use client";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/store-utils.mjs";
import { useStore } from "./StoreProvider";
export function ProductCard({
  product: p,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { add, toggleFavorite, favorites } = useStore();
  const price = Math.min(
    ...p.variants.filter((v) => v.active).map((v) => Number(v.price)),
  );
  const discount = p.oldPrice ? Math.round((1 - price / p.oldPrice) * 100) : 0;
  return (
    <article className="product-card">
      <Link
        href={"/san-pham/" + p.slug}
        className="product-picture"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={p.images[0] || "/images/product-placeholder.svg"}
          alt={p.name}
          width={240}
          height={220}
          sizes="(max-width:600px) 45vw, (max-width:1000px) 25vw, 200px"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
        />
        {discount > 0 && <span className="discount-tag">-{discount}%</span>}
      </Link>
      <button
        className={
          "favorite-button " + (favorites.includes(p.id) ? "is-favorite" : "")
        }
        onClick={() => toggleFavorite(p.id)}
        aria-label={
          favorites.includes(p.id)
            ? "Bỏ yêu thích " + p.name
            : "Yêu thích " + p.name
        }
        aria-pressed={favorites.includes(p.id)}
      >
        <Heart size={18} />
      </button>
      <div className="product-card-body">
        <span className="brand-label">{p.brand}</span>
        <h3>
          <Link href={"/san-pham/" + p.slug}>{p.name}</Link>
        </h3>
        <div className="price">{money(price)}</div>
        {p.oldPrice && <del className="old-price">{money(p.oldPrice)}</del>}
        <div className="product-card-bottom">
          <span className="offer-note">{p.label || "Giá tốt hôm nay"}</span>
          <button
            aria-label={"Thêm " + p.name + " vào giỏ"}
            onClick={() => add(p)}
          >
            <ShoppingCart size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
