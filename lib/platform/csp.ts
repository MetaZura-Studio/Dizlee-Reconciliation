/**
 * Content-Security-Policy builders for middleware (per-request nonces).
 */

export function createCspNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";

  // Production: nonce + strict-dynamic (drops effective unsafe-inline for scripts).
  // Dev: allow unsafe-eval for Turbopack HMR; nonce still applied to Next scripts.
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  // Styles: nonce for <style>/stylesheet tags (clears ZAP "style-src unsafe-inline").
  // React style={{…}} attrs need style-src-attr (CSP3); without it they fall back to style-src.
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    "connect-src 'self'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
