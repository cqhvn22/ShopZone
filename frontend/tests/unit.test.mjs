import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  cartTotal,
  safeReturn,
  safeJsonLd,
  validQuantity,
  slugify,
  orderLabel,
  money,
} from "../src/lib/store-utils.mjs";
test("checkout summary uses decimal values and quantities", () =>
  assert.equal(
    cartTotal([
      { price: 17990000, quantity: 2 },
      { price: 2490000, quantity: 1 },
    ]),
    38470000,
  ));
test("return URL blocks external navigation and backslash URL tricks", () => {
  for (const input of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "javascript:alert(1)",
    null,
  ])
    assert.equal(safeReturn(input), "/");
  assert.equal(safeReturn("/thanh-toan"), "/thanh-toan");
});
test("JSON-LD escapes script injection without breaking JSON", () => {
  const text = safeJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.equal(text.includes("<"), false);
  assert.equal(JSON.parse(text).name, "</script><script>alert(1)</script>");
});
test("quantity validates integers and business limits", () => {
  for (const value of [0, -1, 10001, 1.2, "oops"])
    assert.equal(validQuantity(value), false);
  assert.equal(validQuantity(10000), true);
});
test("Vietnamese slug and monetary formatting are stable", () => {
  assert.equal(slugify("Điện thoại & Phụ kiện"), "dien-thoai-phu-kien");
  assert.ok(money(17990000).includes("17.990.000"));
});
test("COD confirmation remains distinct from paid state", () => {
  assert.equal(orderLabel("CONFIRMED"), "Đã xác nhận");
  assert.equal(orderLabel("PAID"), "Đã thanh toán");
});
test("demo catalog references actual local assets and unique SKUs", () => {
  const catalog = JSON.parse(
    fs.readFileSync(new URL("../src/lib/demo-catalog.json", import.meta.url)),
  );
  const skus = new Set();
  for (const p of catalog.products) {
    assert.ok(catalog.categories.some((c) => c.id === p.categoryId));
    for (const image of p.images)
      assert.ok(fs.existsSync(new URL("../public" + image, import.meta.url)));
    for (const v of p.variants) {
      assert.ok(!skus.has(v.sku));
      assert.ok(v.price >= 0);
      skus.add(v.sku);
    }
  }
  assert.equal(catalog.products.length, 18);
});
