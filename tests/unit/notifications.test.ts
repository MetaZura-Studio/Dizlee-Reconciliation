import { describe, expect, it } from "vitest";

import { trimNotificationPreview } from "@/lib/opco/notifications/shared";
import { parseOpcoInboxFilters } from "@/lib/opco/queries/notifications";

describe("parseOpcoInboxFilters", () => {
  it("defaults to page 1 and all messages", () => {
    expect(parseOpcoInboxFilters(new URLSearchParams())).toEqual({
      page: 1,
      unreadOnly: false,
    });
  });

  it("parses pagination and unread filter", () => {
    expect(
      parseOpcoInboxFilters(
        new URLSearchParams({ page: "2", unreadOnly: "true" }),
      ),
    ).toEqual({
      page: 2,
      unreadOnly: true,
    });
  });
});

describe("trimNotificationPreview", () => {
  it("truncates long bodies", () => {
    const preview = trimNotificationPreview("a".repeat(150));
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(120);
  });
});
