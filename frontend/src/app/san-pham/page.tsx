import { Suspense } from "react";
import { CatalogView } from "@/components/CatalogView";
import { getCatalog, seo } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  return {
    ...seo(
      "Sản phẩm công nghệ",
      "Tìm điện thoại, laptop, tai nghe và phụ kiện theo thương hiệu, mức giá tại ShopZone.",
      "/san-pham",
    ),
    ...(Object.keys(params).length
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}
export default async function Products() {
  const catalog = await getCatalog();
  return (
    <Suspense
      fallback={
        <div className="container loading-state">Đang tải sản phẩm…</div>
      }
    >
      <CatalogView {...catalog} title="Tất cả sản phẩm" />
    </Suspense>
  );
}
