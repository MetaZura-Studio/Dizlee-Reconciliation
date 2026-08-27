import { describe, expect, it } from "vitest";

import { resolveNotificationHref } from "@/lib/platform/notification-deep-links";

describe("resolveNotificationHref", () => {
  it("routes Dizlee reupload request notifications to the reupload page", () => {
    expect(
      resolveNotificationHref(
        "dizlee",
        {
          id: "1",
          subject: "OpCo report reupload requested",
          bodyPreview: "Zain Kuwait requested a reupload",
        },
        "/dizlee/notifications?tab=inbox",
      ),
    ).toBe("/dizlee/reports/reupload");
  });

  it("routes Admin partner link requests to OpCo partners Requests tab", () => {
    expect(
      resolveNotificationHref(
        "admin",
        {
          id: "2",
          subject: "Partner link request: Zain Kuwait",
          body: "Period: August 2026",
          metadataJson: JSON.stringify({
            type: "PARTNER_LINK_REQUEST",
            opcoId: "42",
          }),
        },
        "/admin/notifications",
      ),
    ).toBe("/admin/opco-partners?tab=requests&opcoId=42");
  });

  it("routes OpCo reupload approval to reports history", () => {
    expect(
      resolveNotificationHref(
        "opco",
        {
          id: "3",
          subject: "Reupload request approved",
          bodyPreview: "Your request was approved",
        },
        "/opco/notifications",
      ),
    ).toBe("/opco/reports");
  });
});
