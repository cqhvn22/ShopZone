import { notFound } from "next/navigation";
import {
  getCatalog,
  getProduct,
  getPrice,
  seo,
  siteUrl,
  isDemo,
} from "@/lib/catalog";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  return {
    ...seo(
      p.name,
      `${p.name}. Xem phiên bản, thông tin sản phẩm và giá bán tại ShopZone.`,
      `/san-pham/${p.slug}`,
    ),
    openGraph: {
      title: p.name,
      description: p.description.slice(0, 150),
      type: "website",
      url: "/san-pham/" + p.slug,
      images: [
        { url: p.images[0] || "/images/product-placeholder.svg", alt: p.name },
      ],
    },
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const { products, categories } = await getCatalog();
  const category = categories.find((c) => c.id === p.categoryId);
  return (
    <div className="container inner-page">
      <ProductDetail
        product={p}
        categoryName={category?.name || "Sản phẩm"}
        categorySlug={category?.slug || ""}
        demo={isDemo}
      />
      <section className="catalog-section">
        <div className="section-heading">
          <h2>CÓ THỂ BẠN CŨNG THÍCH</h2>
        </div>
        <div className="product-grid six">
          {products
            .filter((x) => x.id !== p.id)
            .slice(0, 6)
            .map((x) => (
              <ProductCard key={x.id} product={x} />
            ))}
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: p.description,
          image: p.images.map((x) => new URL(x, siteUrl).href),
          sku: p.variants[0]?.sku,
          brand: { "@type": "Brand", name: p.brand },
          url: siteUrl + "/san-pham/" + p.slug,
          ...(!isDemo
            ? {
                offers: {
                  "@type": "Offer",
                  price: getPrice(p),
                  priceCurrency: "VND",
                  url: siteUrl + "/san-pham/" + p.slug,
                  seller: { "@type": "Organization", name: "ShopZone" },
                },
              }
            : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Trang chủ",
              item: siteUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: category?.name || "Sản phẩm",
              item: category
                ? siteUrl + "/danh-muc/" + category.slug
                : siteUrl + "/san-pham",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: p.name,
              item: siteUrl + "/san-pham/" + p.slug,
            },
          ],
        }}
      />
    </div>
  );
}
