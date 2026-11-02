/** @type {import('next').NextConfig} */
const config = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: process.platform === "win32" ? undefined : "standalone",
  poweredByHeader: false,
  htmlLimitedBots: /.*/,
  experimental: process.platform === "win32" ? { cpus: 1 } : undefined,
  cleanDistDir: process.platform !== "win32",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.dummyjson.com" }, { protocol: "https", hostname: "cdn.tgdd.vn" }, { protocol: "https", hostname: "cdnv2.tgdd.vn" }, { protocol: "https", hostname: "cdnv2-tmdt.tgdd.vn" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
