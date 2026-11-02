import fs from "node:fs";

export function readEnv(file = new URL("../../.env", import.meta.url)) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => [
        line.slice(0, line.indexOf("=")),
        line.slice(line.indexOf("=") + 1),
      ]),
  );
}

export class ApiError extends Error {
  constructor(method, path, status) {
    super(`${method} ${path} failed (HTTP ${status}).`);
    this.status = status;
  }
}

export function createApi(
  base = process.env.BACKEND_URL || "http://localhost:8080",
) {
  return async function api(path, method = "GET", body, token, key) {
    const response = await fetch(`${base}/api/v1/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    // Never echo bodies: login responses contain access tokens.
    if (!response.ok) throw new ApiError(method, path, response.status);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };
}

export async function loginAdmin(api) {
  const env = readEnv();
  const email = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD;
  if (!email || !password)
    throw Error("Missing administrator credentials in the project .env.");
  return (await api("auth/login", "POST", { email, password })).accessToken;
}

export async function eventually(read, matches, label, timeout = 120000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const value = await read();
    if (matches(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw Error(
    `Timed out waiting for ${label}. Check Kafka and service logs; rerunning the seed is safe.`,
  );
}
