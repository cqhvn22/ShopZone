import { Suspense } from "react";
import { CatalogView } from "@/components/CatalogView";
import { getCatalog } from "@/lib/catalog";
export const metadata = {
  title: "Sản phẩm yêu thích",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Favorites() {
  const catalog = await getCatalog();
  return (
    <Suspense>
      <CatalogView {...catalog} title="Sản phẩm yêu thích" favoritesOnly />
    </Suspense>
  );
}
