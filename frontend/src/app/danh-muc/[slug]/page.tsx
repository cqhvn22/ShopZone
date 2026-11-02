import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/CatalogView";
import { JsonLd } from "@/components/JsonLd";
import { getCatalog, seo, siteUrl } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { categories } = await getCatalog();
  const c = categories.find((c) => c.slug === slug);
  return {
    ...seo(
      c?.name || "Danh mục",
      `Khám phá ${c?.name.toLowerCase() || "sản phẩm"} tại ShopZone. Lựa chọn theo thương hiệu và khoảng giá phù hợp.`,
      `/danh-muc/${slug}`,
    ),
    ...(Object.keys(query).length
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const c = catalog.categories.find((c) => c.slug === slug);
  if (!c && !catalog.unavailable) notFound();
  return (
    <>
      <Suspense>
        <CatalogView
          {...catalog}
          title={c?.name || "Danh mục sản phẩm"}
          categoryId={c?.id}
        />
      </Suspense>
      {c && (
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
                name: c.name,
                item: siteUrl + "/danh-muc/" + slug,
              },
            ],
          }}
        />
      )}
    </>
  );
}
