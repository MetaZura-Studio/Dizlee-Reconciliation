import { describe, expect, it } from "vitest";

import { formatSessionAuditMessage } from "@/lib/auth/audit";

describe("formatSessionAuditMessage", () => {
  it("formats OpCo login", () => {
    expect(
      formatSessionAuditMessage({
        action: "USER_LOGIN",
        role: "opco",
        email: "zain-jordan@dizlee.com",
        scope: "main",
      }),
    ).toBe("OpCo user signed in (zain-jordan@dizlee.com)");
  });

  it("formats admin login with scope", () => {
    expect(
      formatSessionAuditMessage({
        action: "USER_LOGIN",
        role: "admin",
        email: "admin@dizlee.com",
        scope: "admin",
      }),
    ).toBe("Admin user signed in via admin login (admin@dizlee.com)");
  });

  it("formats partner logout", () => {
    expect(
      formatSessionAuditMessage({
        action: "USER_LOGOUT",
        role: "partner",
        email: "spotify@dizlee.com",
      }),
    ).toBe("Partner user signed out (spotify@dizlee.com)");
  });
});
