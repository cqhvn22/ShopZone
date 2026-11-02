import http from "node:http";
import fs from "node:fs";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, "src/lib/demo-catalog.json")),
);
let orderRequest = null;
const user = {
  id: "test-user",
  fullName: "Khách kiểm thử",
  email: "test@example.test",
  roles: ["CUSTOMER"],
};
const mock = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const send = (status, value) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(value));
  };
  let body = "";
  for await (const chunk of req) body += chunk;
  if (url.pathname === "/api/v1/products")
    return send(200, {
      content: fixture.products,
      totalElements: fixture.products.length,
    });
  if (url.pathname === "/api/v1/categories")
    return send(200, fixture.categories);
  if (url.pathname === "/api/v1/auth/login")
    return send(200, {
      accessToken: "mock-test-token",
      tokenType: "Bearer",
      expiresIn: 900,
      user,
    });
  if (url.pathname === "/api/v1/users/me")
    return req.headers.authorization === "Bearer mock-test-token"
      ? send(200, user)
      : send(401, { detail: "Unauthorized" });
  if (url.pathname === "/api/v1/admin/statistics")
    return send(403, { detail: "Admin required" });
  if (url.pathname === "/api/v1/orders" && req.method === "POST") {
    orderRequest = {
      body: JSON.parse(body),
      key: req.headers["idempotency-key"],
      authorization: req.headers.authorization,
    };
    return send(202, { id: "test-order", status: "PENDING" });
  }
  return send(404, { detail: "Not found" });
});
await new Promise((resolve) => mock.listen(18088, "127.0.0.1", resolve));
const log = fs.openSync(path.join(root, ".backend-test.log"), "w");
const app = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || ".next",
      SHOPZONE_DATA_MODE: "backend",
      BACKEND_URL: "http://127.0.0.1:18088",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", log, log],
    windowsHide: true,
  },
);
const base = "http://127.0.0.1:3001";
let checks = 0;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(base + "/api/session");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  assert.ok(ready, "Test frontend started");
  const page = await fetch(base + "/san-pham/iphone-13-pro");
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /iPhone 13 Pro/);
  assert.match(html, /"@type":"Offer"/);
  assert.ok(!html.includes("Bản xem thử giao diện"));
  checks++;
  assert.equal((await fetch(base + "/san-pham/no-product")).status, 404);
  checks++;
  const robots = await (await fetch(base + "/robots.txt")).text();
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Disallow: \/quan-tri/);
  checks++;
  const login = await fetch(base + "/api/shop/auth/login", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test@example.test",
      password: "SyntheticTestPassword!123",
    }),
  });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.ok(!("accessToken" in loginBody));
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  const cookieHeader = cookie.split(";")[0];
  checks++;
  const session = await fetch(base + "/api/session", {
    headers: { Cookie: cookieHeader },
  });
  assert.deepEqual((await session.json()).user, user);
  checks++;
  const payload = {
    items: [{ sku: fixture.products[0].variants[0].sku, quantity: 2 }],
    paymentMethod: "COD",
    shippingAddress: {
      recipient: "Test",
      phone: "0900000000",
      address: "Test address",
      city: "Test city",
    },
  };
  const checkout = await fetch(base + "/api/shop/orders", {
    method: "POST",
    headers: {
      Origin: base,
      Cookie: cookieHeader,
      "Content-Type": "application/json",
      "Idempotency-Key": "synthetic-checkout-1",
    },
    body: JSON.stringify(payload),
  });
  assert.equal(checkout.status, 202);
  assert.deepEqual(orderRequest.body, payload);
  assert.equal(orderRequest.key, "synthetic-checkout-1");
  assert.equal(orderRequest.authorization, "Bearer mock-test-token");
  checks++;
  assert.equal(
    (
      await fetch(base + "/api/shop/admin/statistics", {
        headers: { Cookie: cookieHeader },
      })
    ).status,
    403,
  );
  checks++;
  assert.equal(
    (
      await fetch(base + "/api/shop/orders", {
        method: "POST",
        headers: { Origin: "https://untrusted.example", Cookie: cookieHeader },
        body: "{}",
      })
    ).status,
    403,
  );
  checks++;
  const logout = await fetch(base + "/api/session", {
    method: "DELETE",
    headers: { Origin: base, Cookie: cookieHeader },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /expires=Thu, 01 Jan 1970/i);
  checks++;
  console.log(
    "PASS: " +
      checks +
      " BFF/backend-contract checks (isolated HTTP stub; not a real Spring Boot transaction).",
  );
} finally {
  app.kill();
  await new Promise((r) => mock.close(r));
  fs.closeSync(log);
}
