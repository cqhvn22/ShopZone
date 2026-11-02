import "server-only";
import { cache } from "react";
import demo from "./demo-catalog.json";
import type { Category, Product } from "./types";
export const isDemo =
  process.env.SHOPZONE_DATA_MODE === "demo" ||
  (!process.env.SHOPZONE_DATA_MODE && process.env.NODE_ENV !== "production");
export const backend = process.env.BACKEND_URL || "http://localhost:8080";
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
).origin;
export const getCatalog = cache(
  async (): Promise<{
    products: Product[];
    categories: Category[];
    unavailable: boolean;
  }> => {
    if (isDemo)
      return {
        products: demo.products as Product[],
        categories: demo.categories,
        unavailable: false,
      };
    try {
      const get = async (path: string) => {
        const r = await fetch(`${backend}/api/v1/${path}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) throw Error("Catalog unavailable");
        return r.json();
      };
      const [page, categories] = await Promise.all([
        get("products?size=100"),
        get("categories"),
      ]);
      return {
        products: page.content.map((p: Product) => ({
          ...p,
          images: p.images?.length
            ? p.images
            : ["/images/product-placeholder.svg"],
        })),
        categories,
        unavailable: false,
      };
    } catch {
      return { products: [], categories: [], unavailable: true };
    }
  },
);
export async function getProduct(slug: string) {
  const { products } = await getCatalog();
  return products.find((p) => p.slug === slug || p.id === slug);
}
export const getPrice = (p: Product) =>
  Math.min(...p.variants.filter((v) => v.active).map((v) => Number(v.price)));
export function seo(title: string, description: string, path: string) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website" as const,
      locale: "vi_VN",
      siteName: "ShopZone",
      images: [
        {
          url: "/images/social-cover.png",
          width: 1200,
          height: 630,
          alt: "ShopZone — Mua sắm công nghệ mỗi ngày",
        },
      ],
    },
    robots: isDemo
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
