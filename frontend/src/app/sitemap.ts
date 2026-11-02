import type { MetadataRoute } from "next";
import { getCatalog, isDemo, siteUrl } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isDemo) return [];
  const { products, categories } = await getCatalog();
  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: siteUrl + "/san-pham", changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: siteUrl + "/danh-muc/" + c.slug,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: siteUrl + "/san-pham/" + p.slug,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
