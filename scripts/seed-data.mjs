import fs from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { seedCatalog } from "../frontend/scripts/seed-catalog.mjs";
import { createApi, loginAdmin, eventually } from "./lib/seed-api.mjs";

// Synthetic development identities, not real customers or transactions.
export async function seedData({
  api = createApi(),
  stateFile = new URL("../.seed-state.json", import.meta.url),
  reportFile = new URL("../.seed-report.json", import.meta.url),
} = {}) {
  const admin = await loginAdmin(api);
  const catalog = await seedCatalog(api, admin);
  const state = fs.existsSync(stateFile)
    ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
    : {
        version: 1,
        customers: Array.from({ length: 3 }, (_, i) => ({
          email: `khachhang${i + 1}@shopzone.test`,
          fullName: `Khách hàng mẫu ${String(i + 1).padStart(2, "0")}`,
          password: randomBytes(20).toString("base64url"),
        })),
        orders: [],
      };
  if (
    state.version !== 1 ||
    state.customers?.length !== 3 ||
    !Array.isArray(state.orders)
  )
    throw Error(
      "Unrecognized seed state. Preserve the file and inspect it before retrying.",
    );
  const save = () =>
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", {
      mode: 0o600,
    });
  // Persist credentials and idempotency keys BEFORE requests, for partial failures.
  save();
  const tokens = [];
  for (const customer of state.customers) {
    try {
      await api("auth/register", "POST", {
        email: customer.email,
        password: customer.password,
        fullName: customer.fullName,
        phone: "0900000000",
      });
    } catch (error) {
      if (error.status !== 409) throw error;
    }
    const session = await api("auth/login", "POST", {
      email: customer.email,
      password: customer.password,
    });
    const user = await api("users/me", "GET", undefined, session.accessToken);
    customer.id = user.id;
    tokens.push(session.accessToken);
    save();
  }
  for (let i = state.orders.length; i < 6; i++) {
    const product = catalog.products[i % catalog.products.length];
    const variant = product.variants.find((v) => v.active);
    if (!variant)
      throw Error(`Seed product has no active variant: ${product.slug}`);
    state.orders.push({
      key: randomUUID(),
      customerIndex: i % 3,
      target: ["COMPLETED", "SHIPPING", "CONFIRMED"][i % 3],
      body: {
        items: [{ sku: variant.sku, quantity: i < 3 ? 1 : 2 }],
        paymentMethod: "COD",
        shippingAddress: {
          recipient: state.customers[i % 3].fullName,
          phone: "0900000000",
          address: "Địa chỉ kiểm thử ShopZone - không giao hàng",
          city: "TP. Hồ Chí Minh",
        },
      },
    });
    save();
  }
  const orders = [];
  for (const entry of state.orders) {
    const token = tokens[entry.customerIndex];
    const submitted = await api("orders", "POST", entry.body, token, entry.key);
    entry.id = submitted.id;
    save();
    let order = await eventually(
      () => api(`orders/${entry.id}`, "GET", undefined, token),
      (o) => {
        if (o.status === "CANCELLED")
          throw Error(
            `Seed order ${o.id} was cancelled. Inspect stock and service logs; no existing stock was reset.`,
          );
        return (
          o.stockCommitted &&
          ["CONFIRMED", "SHIPPING", "COMPLETED"].includes(o.status)
        );
      },
      `stock commitment for ${entry.id}`,
    );
    if (
      ["SHIPPING", "COMPLETED"].includes(entry.target) &&
      order.status === "CONFIRMED"
    ) {
      order = await api(
        `orders/${entry.id}/status`,
        "PATCH",
        { status: "SHIPPING" },
        admin,
      );
    }
    if (entry.target === "COMPLETED" && order.status === "SHIPPING") {
      order = await api(
        `orders/${entry.id}/status`,
        "PATCH",
        { status: "COMPLETED" },
        admin,
      );
    }
    const payment = await eventually(
      async () => {
        try {
          return await api(`payments/${entry.id}`, "GET", undefined, token);
        } catch (error) {
          if (error.status === 404) return null;
          throw error;
        }
      },
      (p) =>
        p &&
        p.status === (order.status === "COMPLETED" ? "SUCCESS" : "PENDING"),
      `COD payment for ${entry.id}`,
    );
    await eventually(
      () => api("notifications", "GET", undefined, token),
      (rows) => rows.some((n) => n.order_id === entry.id),
      `notification for ${entry.id}`,
    );
    orders.push({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      paymentStatus: payment.status,
    });
  }
  // Keep existing quantities when customers have already used these carts.
  for (let i = 0; i < tokens.length; i++) {
    const sku = catalog.products[
      (i + 8) % catalog.products.length
    ].variants.find((v) => v.active)?.sku;
    const cart = await api("cart", "GET", undefined, tokens[i]);
    if (sku && !cart.some((row) => row.sku === sku))
      await api("cart/items", "POST", { sku, quantity: 1 }, tokens[i]);
  }
  const inventory = [];
  for (const product of catalog.products)
    for (const variant of product.variants) {
      inventory.push(
        await api(
          `inventory/${encodeURIComponent(variant.sku)}`,
          "GET",
          undefined,
          admin,
        ),
      );
    }
  const report = {
    verifiedAt: new Date().toISOString(),
    source: "service APIs backed by PostgreSQL and MongoDB",
    dataKind: "synthetic development records; COD payment simulation",
    categories: catalog.categories,
    products: catalog.products.length,
    customers: state.customers.map(({ id, email, fullName }) => ({
      id,
      email,
      fullName,
    })),
    orders,
    inventory,
    statistics: await api("admin/statistics", "GET", undefined, admin),
  };
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
  console.log(
    `Seed verified: ${report.categories} categories, ${report.products} products, ${inventory.length} stock rows, ${state.customers.length} customers, ${orders.length} COD orders.`,
  );
  console.log(
    "Customer credentials: .seed-state.json (local only, excluded from Git and Docker).",
  );
  console.log(
    "Verification report: .seed-report.json. Existing inventory was not overwritten.",
  );
  return report;
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  seedData().catch((error) => {
    console.error(`Database seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}
