import { describe, expect, it } from "vitest";

import { getPortalHomePath, roleMayAccessPath } from "@/lib/auth/roles";
import { isAppRole, normalizeRoleCode } from "@/lib/auth/types";
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

  it("normalizes lookup role codes", () => {
    expect(normalizeRoleCode("ADMIN")).toBe("admin");
    expect(normalizeRoleCode("CLIENT")).toBe("client");
    expect(normalizeRoleCode("OPCO")).toBe("opco");
    expect(normalizeRoleCode("PARTNER")).toBe("partner");
  });

  it("maps roles to portal home paths", () => {
    expect(getPortalHomePath("admin")).toBe("/admin");
    expect(getPortalHomePath("client")).toBe("/dizlee");
    expect(getPortalHomePath("opco")).toBe("/opco");
    expect(getPortalHomePath("partner")).toBe("/partner");
  });

  it("restricts portal paths by role", () => {
    expect(roleMayAccessPath("admin", "/admin/users")).toBe(true);
    expect(roleMayAccessPath("admin", "/opco")).toBe(false);
    expect(roleMayAccessPath("opco", "/opco/reports")).toBe(true);
    expect(isAppRole("client")).toBe(true);
    expect(isAppRole("invalid")).toBe(false);
  });
});
