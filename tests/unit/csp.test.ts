import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  createCspNonce,
} from "@/lib/platform/csp";

describe("createCspNonce", () => {
  it("returns a non-empty base64-ish string", () => {
    const nonce = createCspNonce();
    expect(nonce.length).toBeGreaterThan(8);
    expect(nonce).not.toContain(" ");
  });
});

describe("buildContentSecurityPolicy", () => {
  it("includes the nonce in script-src and keeps style unsafe-inline", () => {
    const csp = buildContentSecurityPolicy("testNonce123");
    expect(csp).toContain("script-src 'self' 'nonce-testNonce123' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
