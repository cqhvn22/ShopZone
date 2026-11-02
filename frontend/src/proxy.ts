import { NextRequest, NextResponse } from "next/server";
import demo from "./lib/demo-catalog.json";

// Resolve catalog existence before React starts streaming headers, so missing
// products/categories return a genuine HTTP 404 rather than a soft 404.
export async function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  let slug: string;
  try {
    slug = decodeURIComponent(segments[1]);
  } catch {
    return errorPage(400, "Đường dẫn không hợp lệ");
  }
  const demoMode =
    process.env.SHOPZONE_DATA_MODE === "demo" ||
    (!process.env.SHOPZONE_DATA_MODE && process.env.NODE_ENV !== "production");
  let rows: Array<{ id: string; slug: string }>;
  if (demoMode)
    rows = segments[0] === "san-pham" ? demo.products : demo.categories;
  else {
    try {
      const endpoint =
        segments[0] === "san-pham" ? "products?size=100" : "categories";
      const r = await fetch(
        (process.env.BACKEND_URL || "http://localhost:8080") +
          "/api/v1/" +
          endpoint,
        { cache: "no-store", signal: AbortSignal.timeout(5000) },
      );
      if (!r.ok) return errorPage(503, "Cửa hàng tạm thời chưa sẵn sàng");
      const data = await r.json();
      rows = Array.isArray(data) ? data : data.content;
    } catch {
      return errorPage(503, "Cửa hàng tạm thời chưa sẵn sàng");
    }
  }
  const item = rows.find((x) => x.slug === slug || x.id === slug);
  if (!item) return errorPage(404, "Không tìm thấy sản phẩm hoặc danh mục");
  if (slug !== item.slug)
    return NextResponse.redirect(
      new URL(
        "/" + segments[0] + "/" + encodeURIComponent(item.slug),
        request.url,
      ),
      308,
    );
  return NextResponse.next();
}
function errorPage(status: number, title: string) {
  return new NextResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,follow"><title>${title} | ShopZone</title></head><body style="margin:0;background:#f3f5f8;color:#253246;font:15px Arial,sans-serif"><header style="padding:25px;background:#0874df;color:white;font-size:30px;font-weight:bold"><a href="/" style="color:white;text-decoration:none">ShopZone</a></header><main style="max-width:700px;margin:60px auto;padding:35px;background:white;text-align:center"><p style="font-size:64px;margin:10px;color:#b4d4f4">${status}</p><h1 style="font-size:25px">${title}</h1><p>Vui lòng quay lại danh sách sản phẩm hoặc thử lại sau.</p><a href="/san-pham" style="display:inline-block;margin-top:20px;padding:13px 25px;background:#0874df;color:white;text-decoration:none;border-radius:4px">Khám phá sản phẩm</a></main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, follow",
        "Cache-Control": "no-store",
        ...(status === 503 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
export const config = { matcher: ["/san-pham/:slug", "/danh-muc/:slug"] };
