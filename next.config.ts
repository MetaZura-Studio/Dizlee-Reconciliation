import type { NextConfig } from "next";

/**
 * Must stay above app Excel upload cap (`MAX_EXCEL_UPLOAD_BYTES` = 20 MiB in
 * `lib/platform/excel-upload.ts`) plus multipart overhead. Kept as a literal so
 * `next.config` does not pull Excel/ZIP validation into the config compiler.
 */
const UPLOAD_BODY_LIMIT_BYTES = 25 * 1024 * 1024;

/**
 * Browser security headers for all routes.
 * Content-Security-Policy is set per-request in middleware.ts (nonce-based).
 */
function securityHeaders(): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    {
      key: "X-DNS-Prefetch-Control",
      value: "off",
    },
  ];

  // HSTS only in production (HTTPS). Avoid locking local HTTP into HTTPS.
  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

const nextConfig: NextConfig = {
  experimental: {
    // Default Next proxy body buffer is 10MB; Excel uploads allow 20MB.
    proxyClientMaxBodySize: UPLOAD_BODY_LIMIT_BYTES,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
