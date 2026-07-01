import { describe, expect, it } from "vitest";
import { isAdminRole } from "@/lib/admin/auth";
import { isPartnerRole } from "@/lib/partner/auth";

describe("auth role helpers", () => {
  it("identifies admin role", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("partner")).toBe(false);
  });

  it("identifies partner role", () => {
    expect(isPartnerRole("partner")).toBe(true);
    expect(isPartnerRole("admin")).toBe(false);
  });
});
