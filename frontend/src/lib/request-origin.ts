/** Match the browser origin to the actual request host, including localhost/IP ports. */
export function sameOrigin(request: {
  headers: Headers;
  nextUrl: { protocol: string };
}): boolean {
  const origin = request.headers.get("origin"),
    host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return (
      new URL(origin).origin ===
      new URL(request.nextUrl.protocol + "//" + host).origin
    );
  } catch {
    return false;
  }
}
