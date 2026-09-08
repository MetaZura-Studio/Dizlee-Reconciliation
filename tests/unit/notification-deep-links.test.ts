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
          body: "Period: 08/2026",
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

  it("routes OpCo invoice notifications to the specific invoice", () => {
    expect(
      resolveNotificationHref(
        "opco",
        {
          id: "4",
          subject: "Invoice received from Dizlee",
          metadataJson: JSON.stringify({
            type: "INVOICE_SENT",
            invoiceId: "99",
            invoiceNumber: "INV-1",
            opcoId: "7",
            month: 8,
            year: 2026,
          }),
        },
        "/opco/notifications",
      ),
    ).toBe("/opco/invoices?id=99");
  });

  it("routes Dizlee invoice outbox deep links to Dizlee invoices", () => {
    expect(
      resolveNotificationHref(
        "dizlee",
        {
          id: "5",
          subject: "Invoice received from Dizlee",
          metadataJson: JSON.stringify({
            type: "INVOICE_SENT",
            invoiceId: "99",
            invoiceNumber: "INV-1",
            opcoId: "7",
            month: 8,
            year: 2026,
          }),
        },
        "/dizlee/notifications?tab=inbox",
      ),
    ).toBe("/dizlee/invoices?id=99");
  });
});
