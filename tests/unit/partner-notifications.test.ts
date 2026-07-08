import { describe, expect, it } from "vitest";

import { trimNotificationPreview } from "@/lib/partner/notifications/shared";
import { parsePartnerInboxFilters } from "@/lib/partner/queries/notifications";

describe("parsePartnerInboxFilters", () => {
  it("defaults to page 1 and all messages", () => {
    expect(parsePartnerInboxFilters(new URLSearchParams())).toEqual({
      page: 1,
      unreadOnly: false,
    });
  });

  it("parses pagination and unread filter", () => {
    expect(
      parsePartnerInboxFilters(
        new URLSearchParams({ page: "2", unreadOnly: "true" }),
      ),
    ).toEqual({
      page: 2,
      unreadOnly: true,
    });
  });
});

describe("partner trimNotificationPreview", () => {
  it("truncates long bodies", () => {
    const preview = trimNotificationPreview("a".repeat(150));
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(120);
  });
});
