/**
 * Unit tests for API path public/role access rules (S14).
 */

import { describe, expect, it } from "vitest";

import {
  isPublicApiPath,
  roleMayAccessApiPath,
} from "@/lib/auth/api-access";

describe("isPublicApiPath", () => {
  it("allows health, auth (except change-password), and cron", () => {
    expect(isPublicApiPath("/api/health")).toBe(true);
    expect(isPublicApiPath("/api/health/ready")).toBe(true);
    expect(isPublicApiPath("/api/auth/forgot-password")).toBe(true);
    expect(isPublicApiPath("/api/auth/set-password")).toBe(true);
    expect(isPublicApiPath("/api/auth/callback/credentials")).toBe(true);
    expect(isPublicApiPath("/api/admin-auth/callback/credentials")).toBe(true);
    expect(isPublicApiPath("/api/admin/cron/submission-reminders")).toBe(true);
    expect(isPublicApiPath("/api/auth/change-password")).toBe(false);
  });

  it("does not allow portal APIs", () => {
    expect(isPublicApiPath("/api/opco/reports")).toBe(false);
    expect(isPublicApiPath("/api/admin/users")).toBe(false);
    expect(isPublicApiPath("/api/dizlee/dashboard")).toBe(false);
  });
});

describe("roleMayAccessApiPath", () => {
  it("maps roles to their API prefixes", () => {
    expect(roleMayAccessApiPath("admin", "/api/admin/users")).toBe(true);
    expect(roleMayAccessApiPath("admin", "/api/dizlee/dashboard")).toBe(false);
    expect(roleMayAccessApiPath("client", "/api/dizlee/reports")).toBe(true);
    expect(roleMayAccessApiPath("opco", "/api/opco/reports")).toBe(true);
    expect(roleMayAccessApiPath("partner", "/api/partner/reports")).toBe(true);
  });

  it("allows any role to change password", () => {
    expect(roleMayAccessApiPath("opco", "/api/auth/change-password")).toBe(
      true,
    );
  });

  it("denies unknown API prefixes (fail closed)", () => {
    expect(roleMayAccessApiPath("admin", "/api/mystery")).toBe(false);
  });
});
