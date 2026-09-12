import type { MetadataRoute } from "next";

/**
 * Explicit robots.txt so UAT/prod always returns a real text response with
 * middleware CSP (avoids Next 404 HTML for /robots.txt — ZAP Medium finding).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
