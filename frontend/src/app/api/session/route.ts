import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/request-origin";
import { backend, isDemo } from "@/lib/catalog";
export async function GET(request: NextRequest) {
  const token = request.cookies.get("sz-session")?.value;
  if (!token || isDemo)
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  try {
    const r = await fetch(backend + "/api/v1/users/me", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const result = NextResponse.json(
      { user: r.ok ? await r.json() : null },
      { headers: { "Cache-Control": "no-store" } },
    );
    if (r.status === 401) result.cookies.delete("sz-session");
    return result;
  } catch {
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { detail: "Yêu cầu không hợp lệ." },
      { status: 403 },
    );
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("sz-session");
  return response;
}
