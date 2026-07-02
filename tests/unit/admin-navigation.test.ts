import { describe, expect, it } from "vitest";

import {
  ADMIN_DEFAULT_ROUTE,
  ADMIN_FOOTER_NAV_ITEMS,
  ADMIN_MAIN_NAV_ITEMS,
  getAdminNavItemForPath,
  isAdminNavActive,
} from "@/lib/admin/navigation";

describe("admin navigation", () => {
  it("defines seven main navigation items in SRS order", () => {
    expect(ADMIN_MAIN_NAV_ITEMS).toHaveLength(7);
    expect(ADMIN_MAIN_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Audit logs",
      "Users",
      "Email Settings",
      "Email Templates",
      "Reminder Settings",
      "OpCo partners",
      "Reconciliation tolerance",
    ]);
  });

  it("defines footer navigation items with Settings disabled", () => {
    expect(ADMIN_FOOTER_NAV_ITEMS).toHaveLength(3);
    expect(ADMIN_FOOTER_NAV_ITEMS[0]).toMatchObject({
      label: "Settings",
      disabled: true,
    });
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
  });
});
