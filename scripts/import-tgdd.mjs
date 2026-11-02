import fs from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createApi, loginAdmin } from "./lib/seed-api.mjs";

const origin = "https://www.thegioididong.com";
function sourceUrl(value) {
  const u = new URL(value, origin);
  if (u.origin !== origin)
    throw Error("Only HTTPS thegioididong.com URLs are accepted");
  return u;
}
export function parseProducts(html, url) {
  const objects = [];
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if ([value["@type"]].flat().includes("Product")) objects.push(value);
    if (value["@graph"]) visit(value["@graph"]);
    if (value.itemListElement) visit(value.itemListElement);
    if (value.item) visit(value.item);
  }
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      visit(JSON.parse(match[1]));
    } catch {}
  }
  return objects.flatMap((p) => {
    const offer = [p.offers]
      .flat()
      .find((o) => o?.priceCurrency === "VND" && Number(o.price) > 0);
    if (!p.name || !offer) return [];
    const canonical = sourceUrl(p.url || url);
    canonical.search = "";
    canonical.hash = "";
    const slug = canonical.pathname.split("/").filter(Boolean).at(-1);
    if (!slug || !/^[-a-z0-9]+$/.test(slug)) return [];
    const images = [p.image]
      .flat()
      .map((i) => (typeof i === "string" ? i : i?.contentUrl || i?.url))
      .filter((i) => {
        try {
          const u = new URL(i);
          return (
            u.protocol === "https:" &&
            ["cdn.tgdd.vn", "cdnv2.tgdd.vn", "cdnv2-tmdt.tgdd.vn"].includes(u.hostname)
          );
        } catch {
          return false;
        }
      });
    const brand = [typeof p.brand === "string" ? p.brand : p.brand?.name || ""].flat().join(', ').slice(0,100);
    return [
      {
        name: String(p.name).slice(0, 255),
        slug: "tgdd-" + slug,
        brand,
        images,
        source: canonical.href,
        price: Number(offer.price),
        specs: Object.fromEntries((p.additionalProperty || []).filter(x=>typeof x.name==='string' && typeof x.value==='string').slice(0,60).map(x=>[x.name,x.value])),
        publishedAt: p.releaseDate || p.datePublished || null,
      },
    ];
  });
}

export async function importProducts(rows, api, token) {
  const categories = await api("categories");
  const category =
    categories.find((c) => c.slug === "dien-thoai") ||
    (await api(
      "categories",
      "POST",
      { name: "Điện thoại", slug: "dien-thoai", active: true },
      token,
    ));
  const existing = [];
  for (let page = 0; ; page++) {
    const p = await api(`products?size=100&page=${page}`);
    existing.push(...p.content);
    if (p.content.length < 100 || existing.length >= p.totalElements) break;
  }
  let created = 0,
    updated = 0;
  for (const row of rows) {
    const found = existing.find((p) => p.slug === row.slug);
    if (found && found.attributes?.["URL nguồn"] !== row.source)
      throw Error(`Slug belongs to another source: ${row.slug}`);
    const sku =
      found?.variants[0]?.sku ||
      "TGDD-" +
        createHash("sha256")
          .update(row.source)
          .digest("hex")
          .slice(0, 16)
          .toUpperCase();
    const data = {
      name: row.name,
      slug: row.slug,
      brand: row.brand,
      categoryId: category.id,
      description: `Thông tin tham khảo từ Thế Giới Di Động, cập nhật ${new Date().toISOString().slice(0, 10)}. Giá và tồn kho tại ShopZone cần được quản trị viên xác nhận trước khi bán.`,
      images: row.images,
      attributes: {
        ...(row.specs || {}),
        Nguồn: "Thế Giới Di Động",
        "URL nguồn": row.source,
        "Cập nhật nguồn": new Date().toISOString(),
        ...(row.publishedAt
          ? { "Ngày công bố từ nguồn": String(row.publishedAt) }
          : {}),
      },
      variants: [{ sku, price: row.price, active: true, attributes: {} }],
    };
    await api(
      found ? `products/${found.id}` : "products",
      found ? "PUT" : "POST",
      data,
      token,
    );
    if (found) updated++;
    else created++;
    try {
      await api(`inventory/${sku}`, "GET", undefined, token);
    } catch (e) {
      if (e.status !== 404) throw e;
      await api(`inventory/${sku}`, "PUT", { onHand: 0 }, token);
    }
  }
  return { created, updated };
}

async function main() {
  const args = process.argv.slice(2),
    apply = args.includes("--apply");
  const limit = Number(args[args.indexOf("--limit") + 1] || 5);
  const max = args.includes("--limit") ? limit : 5;
  if (!Number.isInteger(max) || max < 1 || max > 20)
    throw Error("--limit must be 1..20");
  async function download(url) {
    sourceUrl(url);
    const response = await fetch(url, {
      redirect: "error",
      headers: { "User-Agent": "ShopZoneCatalogImporter/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw Error(
        `Source returned HTTP ${response.status}: ${url}. Import stopped; no bypass attempted.`,
      );
    return response.text();
  }
  const robots = await download(origin + "/robots.txt");
  // Conservative policy: stop when any declared disallow covers catalog pages.
  const denied = [...robots.matchAll(/^Disallow:\s*(\S+)/gim)].map((m) => m[1]);
  if (
    denied.some(
      (p) => p === "/" || "/dtdd".startsWith(p) || p.startsWith("/dtdd"),
    )
  )
    throw Error("robots.txt restricts the phone catalog; import stopped.");
  const provided = args.indexOf("--urls-file");
  let urls;
  if (provided >= 0) {
    urls = JSON.parse(fs.readFileSync(args[provided + 1], "utf8")).map(
      (u) => sourceUrl(u).href,
    );
  } else {
    const listing = await download(origin + "/dtdd");
    urls = [
      ...new Set(
        [...listing.matchAll(/href=["'](\/dtdd\/[a-z0-9-]+)["']/gi)].map(
          (m) => origin + m[1],
        ),
      ),
    ];
  }
  const rows = [];
  const skipped = [];
  for (const url of urls.slice(0, max)) {
    if (!sourceUrl(url).pathname.startsWith("/dtdd/"))
      throw Error("This importer supports phone product pages only.");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const products = parseProducts(await download(url), url);
    if (products.length !== 1) {
      skipped.push({url, reason: `Expected one product with a VND price; found ${products.length}`});
      console.log(`SKIP ${url}: no unambiguous priced product`);
      continue;
    }
    rows.push(products[0]);
    console.log(`SCAN ${rows.length + skipped.length}/${Math.min(urls.length,max)}: ${products[0].name}`);
  }
  if (!rows.length)
    throw Error("No validated products found; nothing imported.");
  const unique = [...new Map(rows.map((r) => [r.source, r])).values()];
  const report = {
        mode: apply ? "apply" : "preview",
        fetchedAt: new Date().toISOString(),
        note: "Current source listing, not a verified release-date ranking.",
        products: unique,
        skipped,
        result: {created:0,updated:0},
  };
  if (apply) {
    const api = createApi();
    report.result = await importProducts(unique, api, await loginAdmin(api));
  }
  const reportIndex=args.indexOf('--report');
  if(reportIndex>=0){
    if(!args[reportIndex+1] || args[reportIndex+1].startsWith('--')) throw Error('--report requires a file path');
    fs.writeFileSync(args[reportIndex+1],JSON.stringify(report,null,2)+'\n');
    console.log(`Report: ${args[reportIndex+1]}`);
  }
  console.log(JSON.stringify({mode:report.mode,scanned:rows.length+skipped.length,valid:unique.length,skipped:skipped.length,...report.result}));
  if(!apply && reportIndex<0)console.log(JSON.stringify(unique,null,2));
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
