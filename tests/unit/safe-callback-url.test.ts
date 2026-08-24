import { describe, expect, it } from "vitest";

import {
  parseSafeRelativeCallbackUrl,
  safeAdminCallbackUrl,
  safeMainPortalCallbackUrl,
} from "@/lib/auth/safe-callback-url";

describe("parseSafeRelativeCallbackUrl", () => {
  it("accepts relative portal paths", () => {
    expect(parseSafeRelativeCallbackUrl("/dizlee/reports")).toBe(
      "/dizlee/reports",
    );
    expect(parseSafeRelativeCallbackUrl("/partner?x=1")).toBe("/partner?x=1");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(parseSafeRelativeCallbackUrl("https://evil.com/dizlee")).toBeNull();
    expect(parseSafeRelativeCallbackUrl("//evil.com/partner")).toBeNull();
    expect(parseSafeRelativeCallbackUrl("http://evil.com/opco")).toBeNull();
  });

  it("rejects encoded protocol-relative tricks", () => {
    expect(parseSafeRelativeCallbackUrl("/%2f%2fevil.com")).toBeNull();
  });
});

describe("safeMainPortalCallbackUrl", () => {
  it("allows matching role prefixes only", () => {
    expect(safeMainPortalCallbackUrl("client", "/dizlee/invoices")).toBe(
      "/dizlee/invoices",
    );
    expect(safeMainPortalCallbackUrl("opco", "/opco/upload")).toBe(
      "/opco/upload",
    );
    expect(safeMainPortalCallbackUrl("partner", "/partner")).toBe("/partner");
  });

  it("rejects cross-portal and external URLs", () => {
    expect(safeMainPortalCallbackUrl("client", "/opco")).toBeNull();
    expect(
      safeMainPortalCallbackUrl("partner", "https://evil.com/partner"),
    ).toBeNull();
    expect(safeMainPortalCallbackUrl("opco", "//evil.com/opco")).toBeNull();
  });
});

describe("safeAdminCallbackUrl", () => {
  it("allows admin paths except login", () => {
    expect(safeAdminCallbackUrl("/admin/users")).toBe("/admin/users");
    expect(safeAdminCallbackUrl("/admin/login")).toBeNull();
    expect(safeAdminCallbackUrl("https://evil.com/admin")).toBeNull();
  });
});
