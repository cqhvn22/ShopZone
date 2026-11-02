// Contract tests with an in-memory API double, NOT database integration tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { seedData } from "../seed-data.mjs";
import { seedCatalog } from "../../frontend/scripts/seed-catalog.mjs";
import { ApiError } from "../lib/seed-api.mjs";

process.env.ADMIN_EMAIL = "admin@seed.test";
process.env.ADMIN_PASSWORD = "LocalTestPassword123!";
const scratch = path.resolve("work/seed-tests");
fs.mkdirSync(scratch, { recursive: true });

function serviceDouble({ loseCheckoutResponse = false } = {}) {
  const categories = [],
    products = [],
    stock = new Map(),
    users = new Map(),
    orders = new Map(),
    carts = new Map();
  const api = async (route, method = "GET", body, token, key) => {
    const missing = () => {
      throw new ApiError(method, route, 404);
    };
    if (route === "auth/login") {
      if (body.email === process.env.ADMIN_EMAIL)
        return { accessToken: "admin" };
      const user = users.get(body.email);
      assert.equal(body.password, user.password);
      return { accessToken: user.email };
    }
    if (route === "auth/register") {
      if (users.has(body.email)) throw new ApiError(method, route, 409);
      const user = { ...body, id: randomUUID() };
      users.set(body.email, user);
      return user;
    }
    if (route === "users/me") return users.get(token);
    if (route === "categories") {
      if (method === "POST") {
        const row = { ...body, id: randomUUID() };
        categories.push(row);
        return row;
      }
      return categories;
    }
    if (route.startsWith("products?"))
      return { content: products, totalElements: products.length };
    if (route === "products" && method === "POST") {
      const row = { ...body, id: randomUUID() };
      products.push(row);
      return row;
    }
    if (route.startsWith("inventory/")) {
      const sku = decodeURIComponent(route.slice(10));
      if (method === "PUT")
        stock.set(sku, {
          sku,
          on_hand: body.onHand,
          reserved: 0,
          available: body.onHand,
        });
      return stock.get(sku) || missing();
    }
    if (route === "orders" && method === "POST") {
      assert.ok(key, "Every checkout has a persistent idempotency key");
      assert.deepEqual(
        Object.keys(body.items[0]).sort(),
        ["quantity", "sku"],
        "Client does not send prices",
      );
      const identity = token + ":" + key;
      if (orders.has(identity)) return structuredClone(orders.get(identity));
      const amount = body.items.reduce((sum, item) => {
        const variant = products
          .flatMap((p) => p.variants)
          .find((v) => v.sku === item.sku);
        const row = stock.get(item.sku);
        row.on_hand -= item.quantity;
        row.available -= item.quantity;
        return sum + Number(variant.price) * item.quantity;
      }, 0);
      const order = {
        id: randomUUID(),
        customer: token,
        status: "CONFIRMED",
        stockCommitted: true,
        totalAmount: amount,
      };
      orders.set(identity, order);
      if (loseCheckoutResponse) {
        loseCheckoutResponse = false;
        throw Error("Simulated response lost after checkout commit");
      }
      return structuredClone(order);
    }
    if (route.startsWith("orders/")) {
      const order = [...orders.values()].find(
        (o) => o.id === route.split("/")[1],
      );
      if (!order) return missing();
      if (method === "PATCH") order.status = body.status;
      return structuredClone(order);
    }
    if (route.startsWith("payments/")) {
      const order = [...orders.values()].find(
        (o) => o.id === route.split("/")[1],
      );
      return { status: order.status === "COMPLETED" ? "SUCCESS" : "PENDING" };
    }
    if (route === "notifications")
      return [...orders.values()]
        .filter((o) => o.customer === token)
        .map((o) => ({ order_id: o.id }));
    if (route === "cart") return carts.get(token) || [];
    if (route === "cart/items") {
      const rows = carts.get(token) || [];
      const existing = rows.find((row) => row.sku === body.sku);
      if (existing) existing.quantity += body.quantity;
      else rows.push({ ...body, id: randomUUID() });
      carts.set(token, rows);
      return rows;
    }
    if (route === "admin/statistics") return { total_orders: orders.size };
    throw Error(`Unexpected contract request: ${method} ${route}`);
  };
  return { api, categories, products, stock, users, orders, carts };
}

function files() {
  const directory = fs.mkdtempSync(path.join(scratch, "run-"));
  return {
    stateFile: path.join(directory, "state.json"),
    reportFile: path.join(directory, "report.json"),
  };
}

test("catalog rerun repairs missing stock without resetting existing inventory", async () => {
  const backend = serviceDouble();
  const first = await seedCatalog(backend.api, "admin");
  assert.equal(first.productsCreated, 18);
  assert.equal(first.categories, 5);
  const [firstSku, secondSku] = [...backend.stock.keys()];
  backend.stock.get(firstSku).on_hand = 7;
  backend.stock.delete(secondSku);
  const second = await seedCatalog(backend.api, "admin");
  assert.equal(second.productsCreated, 0);
  assert.equal(second.stockCreated, 1);
  assert.equal(backend.stock.get(firstSku).on_hand, 7);
  assert.equal(backend.stock.get(secondSku).on_hand, 30);
});

test("full seed rerun preserves accounts, order identities, stock and cart quantities", async () => {
  const backend = serviceDouble(),
    location = files();
  const first = await seedData({ api: backend.api, ...location });
  const firstStock = JSON.stringify([...backend.stock]);
  const firstState = fs.readFileSync(location.stateFile, "utf8");
  const second = await seedData({ api: backend.api, ...location });
  assert.equal(backend.users.size, 3);
  assert.equal(backend.orders.size, 6);
  assert.equal(backend.carts.size, 3);
  assert.equal(JSON.stringify([...backend.stock]), firstStock);
  assert.equal(fs.readFileSync(location.stateFile, "utf8"), firstState);
  assert.deepEqual(second.orders, first.orders);
  assert.deepEqual(
    first.orders.map((o) => o.status),
    [
      "COMPLETED",
      "SHIPPING",
      "CONFIRMED",
      "COMPLETED",
      "SHIPPING",
      "CONFIRMED",
    ],
  );
  assert.ok(
    [...backend.carts.values()].every(
      (rows) => rows.length === 1 && rows[0].quantity === 1,
    ),
  );
  const reportText = fs.readFileSync(location.reportFile, "utf8");
  for (const user of backend.users.values())
    assert.ok(!reportText.includes(user.password));
  assert.ok(!reportText.includes("accessToken"));
});

test("response loss after accepted checkout resumes without duplicate orders or stock deductions", async () => {
  const backend = serviceDouble({ loseCheckoutResponse: true }),
    location = files();
  await assert.rejects(
    seedData({ api: backend.api, ...location }),
    /response lost/,
  );
  assert.equal(backend.orders.size, 1);
  await seedData({ api: backend.api, ...location });
  assert.equal(backend.orders.size, 6);
  const firstSku = backend.products[0].variants[0].sku;
  assert.equal(backend.stock.get(firstSku).on_hand, 29);
});

test("backend failure stops before generating customer state or a success report", async () => {
  const location = files();
  await assert.rejects(
    seedData({
      api: async () => {
        throw new ApiError("POST", "auth/login", 503);
      },
      ...location,
    }),
    /503/,
  );
  assert.ok(!fs.existsSync(location.stateFile));
  assert.ok(!fs.existsSync(location.reportFile));
});
