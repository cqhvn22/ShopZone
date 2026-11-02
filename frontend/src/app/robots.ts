import type { MetadataRoute } from "next";
import { isDemo, siteUrl } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return isDemo
    ? { rules: { userAgent: "*", disallow: "/" } }
    : {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/api/",
            "/gio-hang",
            "/thanh-toan",
            "/dang-nhap",
            "/dang-ky",
            "/don-hang",
            "/quan-tri",
            "/yeu-thich",
            "/*?",
          ],
        },
        sitemap: siteUrl + "/sitemap.xml",
      };
}
