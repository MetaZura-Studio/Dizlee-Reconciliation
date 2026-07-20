import { describe, expect, it } from "vitest";

import {
  getLoginPathForPathname,
  getMainPortalHomePath,
  getPortalHomePath,
  roleMayAccessPath,
} from "@/lib/auth/roles";
import {
  isMainPortalRole,
  roleAllowedForLoginScope,
} from "@/lib/auth/scopes";
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
    expect(getMainPortalHomePath("opco")).toBe("/opco");
    expect(getMainPortalHomePath("partner")).toBe("/partner");
  });

  it("enforces login scope by role", () => {
    expect(roleAllowedForLoginScope("admin", "admin")).toBe(true);
    expect(roleAllowedForLoginScope("admin", "main")).toBe(false);
    expect(roleAllowedForLoginScope("opco", "main")).toBe(true);
    expect(roleAllowedForLoginScope("opco", "admin")).toBe(false);
    expect(isMainPortalRole("client")).toBe(true);
    expect(isMainPortalRole("admin")).toBe(false);
  });

  it("routes unauthenticated users to the correct login page", () => {
    expect(getLoginPathForPathname("/admin/users")).toBe("/admin/login");
    expect(getLoginPathForPathname("/opco/reports")).toBe("/login");
  });

  it("restricts portal paths by role", () => {
    expect(roleMayAccessPath("admin", "/admin/users")).toBe(true);
    expect(roleMayAccessPath("admin", "/admin/login")).toBe(false);
    expect(roleMayAccessPath("admin", "/opco")).toBe(false);
    expect(roleMayAccessPath("opco", "/opco/reports")).toBe(true);
    expect(isAppRole("client")).toBe(true);
    expect(isAppRole("invalid")).toBe(false);
  });
});
