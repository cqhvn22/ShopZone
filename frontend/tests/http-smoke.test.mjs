import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.FRONTEND_URL || "http://localhost:3000";
async function html(path) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  return response.text();
}
test("home is server-rendered with Vietnamese headings and product links", async () => {
  const text = await html("/");
  assert.match(text, /<html[^>]*lang="vi"/);
  assert.match(text, /iPhone 13 Pro/);
  assert.match(text, /rel="canonical"/);
  assert.match(text, /property="og:title"/);
  assert.equal((text.match(/<h1[\s>]/g) || []).length, 1);
});
test("product SEO includes product and breadcrumb JSON-LD", async () => {
  const text = await html("/san-pham/iphone-13-pro");
  assert.match(text, /"@type":"Product"/);
  assert.match(text, /"@type":"BreadcrumbList"/);
  assert.match(text, /<h1[^>]*>iPhone 13 Pro/);
  assert.match(text, /noindex/);
});
test("catalog, cart, checkout, account, orders and policy routes render", async () => {
  for (const path of [
    "/san-pham",
    "/danh-muc/laptop",
    "/gio-hang",
    "/thanh-toan",
    "/dang-nhap",
    "/dang-ky",
    "/don-hang",
    "/quan-tri",
    "/thong-tin/bao-mat",
  ])
    await html(path);
});
test("unknown product returns HTTP 404", async () =>
  assert.equal((await fetch(base + "/san-pham/does-not-exist")).status, 404));
test("demo prevents indexing and creating real transactions", async () => {
  const robots = await html("/robots.txt");
  assert.match(robots, /Disallow: \//);
  const response = await fetch(base + "/api/shop/orders", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).detail, /xem thử/);
});
test("BFF blocks foreign origins and payment callbacks", async () => {
  assert.equal(
    (
      await fetch(base + "/api/shop/orders", {
        method: "POST",
        headers: { Origin: "https://evil.test" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/shop/payments/callback", {
        method: "POST",
        headers: { Origin: base },
        body: "{}",
      })
    ).status,
    404,
  );
});
test("session does not expose an access token", async () => {
  const r = await fetch(base + "/api/session");
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.deepEqual(await r.json(), { user: null });
});
