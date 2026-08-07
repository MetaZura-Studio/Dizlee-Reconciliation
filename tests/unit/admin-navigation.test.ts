import { describe, expect, it } from "vitest";

import {
  ADMIN_DEFAULT_ROUTE,
  ADMIN_FOOTER_NAV_ITEMS,
  ADMIN_MAIN_NAV_ITEMS,
  getAdminNavItemForPath,
  isAdminNavActive,
} from "@/lib/admin/navigation";

describe("admin navigation", () => {
  it("defines main navigation with Organization and Settings groups", () => {
    expect(ADMIN_MAIN_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Dashboard",
      "Users",
      "Organization",
      "Audit logs",
      "Settings",
    ]);

    const organization = ADMIN_MAIN_NAV_ITEMS.find(
      (item) => item.label === "Organization",
    );
    expect(organization?.children?.map((item) => item.label)).toEqual([
      "OpCos",
      "Partners",
      "OpCo partners",
    ]);

    const settings = ADMIN_MAIN_NAV_ITEMS.find((item) => item.label === "Settings");
    expect(settings?.children?.map((item) => item.label)).toEqual([
      "Email Templates",
      "Reconciliation tolerance",
      "Currencies & USD rates",
      "Invoice bank details",
      "Email Settings",
      "Reminder Settings",
    ]);
  });

  it("keeps the footer navigation empty", () => {
    expect(ADMIN_FOOTER_NAV_ITEMS).toHaveLength(0);
  });

  it("uses Dashboard as the default admin landing route", () => {
    expect(ADMIN_DEFAULT_ROUTE).toBe("/admin");
  });

  it("marks the dashboard route only on the exact path", () => {
    expect(isAdminNavActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavActive("/admin/users", "/admin")).toBe(false);
  });

  it("marks active routes including nested paths", () => {
    expect(isAdminNavActive("/admin/users", "/admin/users")).toBe(true);
    expect(isAdminNavActive("/admin/users/123", "/admin/users")).toBe(true);
    expect(isAdminNavActive("/admin/audit-logs", "/admin/users")).toBe(false);
  });

  it("resolves the nav item for the current path", () => {
    expect(getAdminNavItemForPath("/admin/opcos")?.label).toBe("OpCos");
    expect(getAdminNavItemForPath("/admin/partners")?.label).toBe("Partners");
    expect(getAdminNavItemForPath("/admin/opco-partners")?.label).toBe(
      "OpCo partners",
    );
    expect(getAdminNavItemForPath("/admin/currencies")?.label).toBe(
      "Currencies & USD rates",
    );
    expect(getAdminNavItemForPath("/admin/email-templates")?.label).toBe(
      "Email Templates",
    );
    expect(getAdminNavItemForPath("/admin/email-settings")?.label).toBe(
      "Email Settings",
    );
    expect(getAdminNavItemForPath("/admin/reminder-settings")?.label).toBe(
      "Reminder Settings",
    );
  });
});
