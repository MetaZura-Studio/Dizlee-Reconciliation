import { describe, expect, it } from "vitest";

import {
  ADMIN_DEFAULT_ROUTE,
  ADMIN_FOOTER_NAV_ITEMS,
  ADMIN_MAIN_NAV_ITEMS,
  getAdminNavItemForPath,
  isAdminNavActive,
} from "@/lib/admin/navigation";

describe("admin navigation", () => {
  it("defines main navigation items with settings children", () => {
    expect(ADMIN_MAIN_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Audit logs",
      "Users",
      "OpCos",
      "Partners",
      "Email Templates",
      "OpCo partners",
      "Reconciliation tolerance",
      "Currencies & USD rates",
      "Invoice bank details",
      "Settings",
    ]);

    const settings = ADMIN_MAIN_NAV_ITEMS.find((item) => item.label === "Settings");
    expect(settings?.children?.map((item) => item.label)).toEqual([
      "Email Settings",
      "Reminder Settings",
    ]);
  });

  it("keeps the footer navigation empty", () => {
    expect(ADMIN_FOOTER_NAV_ITEMS).toHaveLength(0);
  });

  it("uses Users as the default admin landing route", () => {
    expect(ADMIN_DEFAULT_ROUTE).toBe("/admin/users");
  });

  it("marks active routes including nested paths", () => {
    expect(isAdminNavActive("/admin/users", "/admin/users")).toBe(true);
    expect(isAdminNavActive("/admin/users/123", "/admin/users")).toBe(true);
    expect(isAdminNavActive("/admin/audit-logs", "/admin/users")).toBe(false);
  });

  it("resolves the nav item for the current path", () => {
    expect(getAdminNavItemForPath("/admin/currencies")?.label).toBe(
      "Currencies & USD rates",
    );
    expect(getAdminNavItemForPath("/admin/email-settings")?.label).toBe(
      "Email Settings",
    );
    expect(getAdminNavItemForPath("/admin/reminder-settings")?.label).toBe(
      "Reminder Settings",
    );
  });
});
