"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, SlidersHorizontal, X, Search } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { useStore } from "./StoreProvider";
import type { Category, Product } from "@/lib/types";
export function CatalogView({
  products,
  categories,
  title,
  categoryId,
  favoritesOnly = false,
  unavailable = false,
}: {
  products: Product[];
  categories: Category[];
  title: string;
  categoryId?: string;
  favoritesOnly?: boolean;
  unavailable?: boolean;
}) {
  const search = useSearchParams();
  const router = useRouter(),
    pathname = usePathname();
  const [showFilters, setShowFilters] = useState(false);
  const { favorites } = useStore();
  const q = search.get("q") || "",
    brand = search.get("brand") || "",
    range = search.get("price") || "",
    sort = search.get("sort") || "featured",
    category = search.get("category") || categoryId;
  const filtered = useMemo(() => {
    let rows = products.filter(
      (p) =>
        (!category || p.categoryId === category) &&
        (!brand || p.brand === brand) &&
        (!favoritesOnly || favorites.includes(p.id)) &&
        (!q ||
          p.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(
              q
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, ""),
            )),
    );
    if (range) {
      const [min, max] = range.split("-").map(Number);
      rows = rows.filter((p) => {
        const price = Math.min(
          ...p.variants.filter((v) => v.active).map((v) => Number(v.price)),
        );
        return price >= min && (!max || price <= max);
      });
    }
    const price = (p: Product) =>
      Math.min(
        ...p.variants.filter((v) => v.active).map((v) => Number(v.price)),
      );
    if (sort === "price-asc") rows.sort((a, b) => price(a) - price(b));
    if (sort === "price-desc") rows.sort((a, b) => price(b) - price(a));
    if (sort === "discount")
      rows.sort(
        (a, b) =>
          (b.oldPrice ? 1 - price(b) / b.oldPrice : 0) -
          (a.oldPrice ? 1 - price(a) / a.oldPrice : 0),
      );
    return rows;
  }, [products, q, brand, range, sort, category, favoritesOnly, favorites]);
  const brands = Array.from(
    new Set(
      products
        .filter((p) => !category || p.categoryId === category)
        .map((p) => p.brand),
    ),
  );
  function change(key: string, value: string) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(pathname + (next.size ? "?" + next.toString() : ""), {
      scroll: false,
    });
  }
  return (
    <div className="container inner-page">
      <nav className="breadcrumbs" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={13} />
        <span>{title}</span>
      </nav>
      <div className="catalog-layout">
        <aside className={"filter-sidebar " + (showFilters ? "open" : "")}>
          <div className="filter-title">
            <h2>
              <SlidersHorizontal size={18} /> BỘ LỌC SẢN PHẨM
            </h2>
            <button
              onClick={() => setShowFilters(false)}
              aria-label="Đóng bộ lọc"
            >
              <X size={18} />
            </button>
          </div>
          {!categoryId && (
            <fieldset>
              <legend>Danh mục</legend>
              <label>
                <input
                  type="radio"
                  name="category"
                  checked={!category}
                  onChange={() => change("category", "")}
                />
                Tất cả sản phẩm
              </label>
              {categories.map((c) => (
                <label key={c.id}>
                  <input
                    type="radio"
                    name="category"
                    checked={category === c.id}
                    onChange={() => change("category", c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </fieldset>
          )}
          <fieldset>
            <legend>Thương hiệu</legend>
            <label>
              <input
                type="radio"
                name="brand"
                checked={!brand}
                onChange={() => change("brand", "")}
              />
              Tất cả thương hiệu
            </label>
            {brands.map((b) => (
              <label key={b}>
                <input
                  type="radio"
                  name="brand"
                  checked={brand === b}
                  onChange={() => change("brand", b)}
                />
                {b}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Khoảng giá</legend>
            {[
              ["", "Tất cả mức giá"],
              ["0-1000000", "Dưới 1 triệu"],
              ["1000000-5000000", "1 triệu – 5 triệu"],
              ["5000000-15000000", "5 triệu – 15 triệu"],
              ["15000000-30000000", "15 triệu – 30 triệu"],
              ["30000000-0", "Trên 30 triệu"],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  name="price"
                  type="radio"
                  checked={range === value}
                  onChange={() => change("price", value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <Link className="clear-filters" href={pathname}>
            Xóa bộ lọc
          </Link>
        </aside>
        <section className="catalog-results">
          <div className="catalog-intro">
            <h1>{q ? "Kết quả tìm kiếm: “" + q + "”" : title}</h1>
            <p>
              {unavailable
                ? "Cửa hàng chưa sẵn sàng. Vui lòng quay lại sau."
                : `${filtered.length} sản phẩm phù hợp với lựa chọn của bạn`}
            </p>
          </div>
          <div className="sort-bar">
            <button
              className="mobile-filter-button"
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal size={16} /> Bộ lọc
            </button>
            <span>Sắp xếp theo:</span>
            {[
              ["featured", "Nổi bật"],
              ["discount", "Ưu đãi tốt"],
            ].map(([v, label]) => (
              <button
                className={sort === v ? "active" : ""}
                key={v}
                onClick={() => change("sort", v)}
              >
                {label}
              </button>
            ))}
            <select
              aria-label="Sắp xếp theo giá"
              value={sort.startsWith("price") ? sort : ""}
              onChange={(e) => change("sort", e.target.value || "featured")}
            >
              <option value="">Giá sản phẩm</option>
              <option value="price-asc">Giá: thấp đến cao</option>
              <option value="price-desc">Giá: cao đến thấp</option>
            </select>
          </div>
          {filtered.length ? (
            <div className="product-grid four">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={46} />
              <h2>
                {favoritesOnly
                  ? "Bạn chưa lưu sản phẩm nào"
                  : "Chưa tìm thấy sản phẩm phù hợp"}
              </h2>
              <p>
                {favoritesOnly
                  ? "Nhấn vào biểu tượng trái tim để lưu sản phẩm bạn thích."
                  : "Thử tìm kiếm bằng từ khóa khác hoặc điều chỉnh bộ lọc."}
              </p>
              <Link href="/san-pham" className="btn primary">
                Khám phá sản phẩm
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
