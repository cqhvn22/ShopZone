import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Zap, ShieldCheck, Truck } from "lucide-react";
import { HomePromotions } from "@/components/HomePromotions";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { getCatalog, seo, siteUrl, isDemo } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export const metadata = seo(
  "ShopZone — Mua sắm công nghệ mỗi ngày",
  "Khám phá điện thoại, laptop và phụ kiện công nghệ tại ShopZone. So sánh sản phẩm, chọn phiên bản và mua sắm thuận tiện.",
  "/",
);
export default async function Home() {
  const { products, categories, unavailable } = await getCatalog();
  return (
    <div className="container home-page">
      <h1 className="sr-only">
        ShopZone — Điện thoại, laptop và phụ kiện công nghệ
      </h1>
      <HomePromotions />
      {unavailable ? (
        <section className="empty-state">
          <h2>Danh mục đang được cập nhật</h2>
          <p>Chưa kết nối được cửa hàng. Vui lòng thử lại sau.</p>
          <Link className="btn primary" href="/">
            Tải lại trang
          </Link>
        </section>
      ) : (
        <>
          <section className="deals-section">
            <div className="section-heading flash-heading">
              <h2>
                <Zap size={28} fill="currentColor" /> GIÁ TỐT MỖI NGÀY
              </h2>
              <span className="heading-sub">Chọn đúng món · Mua đúng giá</span>
              <Link href="/san-pham?sort=discount">
                Xem tất cả <ArrowRight size={15} />
              </Link>
            </div>
            <div className="product-grid six">
              {products.slice(0, 6).map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          </section>
          <div className="wide-promotion">
            <div>
              <small>LỰA CHỌN CHO GÓC LÀM VIỆC CỦA BẠN</small>
              <h2>Laptop tốt. Mỗi ngày thêm năng suất.</h2>
              <p>
                Từ học tập, làm việc đến sáng tạo — tìm chiếc máy dành cho bạn.
              </p>
              <Link className="btn light" href="/danh-muc/laptop">
                Khám phá laptop <ArrowRight size={16} />
              </Link>
            </div>
            <Image
              src="/images/products/apple-macbook-pro-14-inch-space-grey.webp"
              alt="MacBook Pro cho học tập và làm việc"
              width={360}
              height={240}
              sizes="(max-width:600px) 45vw, 320px"
            />
          </div>
          {[
            ["dien-thoai", "ĐIỆN THOẠI ĐÁNG SẮM"],
            ["laptop", "LAPTOP CHO MỌI NHU CẦU"],
            ["tai-nghe", "ÂM THANH & PHỤ KIỆN"],
          ].map(([id, title]) => {
            const category = categories.find((c) => c.slug === id);
            const items = products.filter((p) => p.categoryId === category?.id);
            if (!items.length) return null;
            return (
              <section className="catalog-section" key={id}>
                <div className="section-heading">
                  <h2>{title}</h2>
                  <div className="brand-links">
                    {Array.from(new Set(items.map((p) => p.brand)))
                      .slice(0, 4)
                      .map((b) => (
                        <Link
                          key={b}
                          href={
                            "/danh-muc/" +
                            id +
                            "?brand=" +
                            encodeURIComponent(b)
                          }
                        >
                          {b}
                        </Link>
                      ))}
                  </div>
                  <Link href={"/danh-muc/" + id}>
                    Xem tất cả <ArrowRight size={15} />
                  </Link>
                </div>
                <div className="product-grid six">
                  {items.slice(0, 6).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            );
          })}
          <section className="recommendations">
            <div className="section-heading">
              <h2>GỢI Ý CHO BẠN</h2>
              <span>Những lựa chọn khác từ ShopZone</span>
            </div>
            <div className="product-grid six">
              {products.slice(8, 14).map((p) => (
                <ProductCard product={p} key={p.id} />
              ))}
            </div>
            <Link className="browse-more" href="/san-pham">
              Xem thêm sản phẩm <ArrowRight size={16} />
            </Link>
          </section>
        </>
      )}
      <section className="home-seo-content">
        <h2>ShopZone — Công nghệ trong tầm tay</h2>
        <p>
          Từ điện thoại cho liên lạc hằng ngày, laptop phục vụ công việc đến tai
          nghe và đồng hồ thông minh, ShopZone giúp bạn khám phá sản phẩm theo
          từng nhu cầu. Xem thông tin, so sánh mức giá và chọn phiên bản phù hợp
          trước khi đặt hàng.
        </p>
        <p>
          Khám phá <Link href="/danh-muc/dien-thoai">điện thoại</Link>,{" "}
          <Link href="/danh-muc/laptop">laptop</Link> và{" "}
          <Link href="/danh-muc/phu-kien">phụ kiện</Link> hoặc sử dụng tìm kiếm
          để đến thẳng sản phẩm bạn quan tâm.
        </p>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ShopZone",
          url: siteUrl,
          inLanguage: "vi-VN",
        }}
      />
    </div>
  );
}
