import { describe, expect, it } from "vitest";

import {
  DIZLEE_NAV_ITEMS,
  isDizleeNavActive,
} from "@/lib/dizlee/navigation";

describe("dizlee navigation", () => {
  it("includes Communications before Notifications", () => {
    const labels = DIZLEE_NAV_ITEMS.map((item) => item.label);
    const communicationsIndex = labels.indexOf("Communications");
    const notificationsIndex = labels.indexOf("Notifications");

    expect(communicationsIndex).toBeGreaterThanOrEqual(0);
    expect(notificationsIndex).toBeGreaterThan(communicationsIndex);
    expect(DIZLEE_NAV_ITEMS.find((item) => item.label === "Communications")).toMatchObject(
      { href: "/dizlee/communications" },
    );
    expect(DIZLEE_NAV_ITEMS.find((item) => item.label === "Notifications")).toMatchObject(
      { href: "/dizlee/notifications" },
    );
  });

  it("marks communications routes active for nested paths", () => {
    expect(isDizleeNavActive("/dizlee/communications", "/dizlee/communications")).toBe(
      true,
    );
    expect(isDizleeNavActive("/dizlee/communications/extra", "/dizlee/communications")).toBe(
      true,
    );
    expect(isDizleeNavActive("/dizlee/notifications", "/dizlee/communications")).toBe(
      false,
    );
  });

  it("marks notifications routes active for nested paths", () => {
    expect(isDizleeNavActive("/dizlee/notifications", "/dizlee/notifications")).toBe(
      true,
    );
    expect(isDizleeNavActive("/dizlee/notifications/extra", "/dizlee/notifications")).toBe(
      true,
    );
  });
});
