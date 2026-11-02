import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/request-origin";
import { backend, isDemo } from "@/lib/catalog";
const allowed =
  /^(auth\/(login|register)|products(?:\/[^/]+(?:\/status)?)?|categories(?:\/[^/]+)?|cart(?:\/items(?:\/[^/]+)?)?|orders(?:\/[^/]+(?:\/(?:cancel|status))?)?|payments\/[^/]+|notifications|users(?:\/me\/addresses(?:\/[^/]+)?|\/[^/]+(?:\/status)?)?|admin\/statistics|inventory\/[^/]+)$/;
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const endpoint = path.join("/");
  if (
    !allowed.test(endpoint) ||
    path.some((p) => p === "." || p === ".." || p.includes("\\")) ||
    endpoint === "payments/callback"
  )
    return NextResponse.json(
      { detail: "Không tìm thấy API." },
      { status: 404 },
    );
  if (request.method !== "GET" && !sameOrigin(request))
    return NextResponse.json(
      { detail: "Yêu cầu không hợp lệ." },
      { status: 403 },
    );
  if (isDemo)
    return NextResponse.json(
      {
        detail:
          "Bản xem thử chưa kết nối giao dịch thật. Hãy chuyển cửa hàng sang chế độ backend để sử dụng chức năng này.",
      },
      { status: 503 },
    );
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = request.cookies.get("sz-session")?.value;
  if (token) headers.set("Authorization", "Bearer " + token);
  const key = request.headers.get("idempotency-key");
  if (key) headers.set("Idempotency-Key", key);
  try {
    const response = await fetch(
      backend +
        "/api/v1/" +
        path.map(encodeURIComponent).join("/") +
        request.nextUrl.search,
      {
        method: request.method,
        headers,
        body: request.method === "GET" ? undefined : await request.text(),
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );
    const text = await response.text();
    let body: any;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { detail: "Cửa hàng chưa phản hồi đúng định dạng." };
    }
    const login = endpoint === "auth/login" && response.ok;
    const result =
      body === null
        ? new NextResponse(null, { status: response.status })
        : NextResponse.json(login ? { user: body.user } : body, {
            status: response.status,
          });
    result.headers.set("Cache-Control", "no-store");
    if (login && typeof body.accessToken === "string")
      result.cookies.set("sz-session", body.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 900,
      });
    if (response.status === 401) result.cookies.delete("sz-session");
    return result;
  } catch {
    return NextResponse.json(
      { detail: "Chưa kết nối được máy chủ cửa hàng. Vui lòng thử lại sau." },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
