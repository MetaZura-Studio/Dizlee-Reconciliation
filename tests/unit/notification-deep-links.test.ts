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

  it("routes Admin report map requests to OpCo report-mapping", () => {
    expect(
      resolveNotificationHref(
        "admin",
        {
          id: "2b",
          subject: "Report map request: Zain Kuwait",
          metadataJson: JSON.stringify({
            type: "REPORT_MAP_REQUEST",
            opcoId: "42",
          }),
        },
        "/admin/notifications",
      ),
    ).toBe("/admin/opcos/42/report-mapping");
  });

  it("routes OpCo report-map-ready notifications to upload", () => {
    expect(
      resolveNotificationHref(
        "opco",
        {
          id: "2c",
          subject: "Report mapping is ready",
          metadataJson: JSON.stringify({
            type: "REPORT_MAP_READY",
            opcoId: "42",
            opcoName: "Zain Kuwait",
          }),
        },
        "/opco/notifications",
      ),
    ).toBe("/opco/upload");
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

  it("routes Dizlee invoice-acknowledged notifications to the invoice", () => {
    expect(
      resolveNotificationHref(
        "dizlee",
        {
          id: "5b",
          subject: "Invoice acknowledged",
          metadataJson: JSON.stringify({
            type: "INVOICE_ACKNOWLEDGED",
            invoiceId: "99",
            invoiceNumber: "INV-1",
            opcoId: "7",
            opcoName: "Zain KSA",
            month: 9,
            year: 2026,
          }),
        },
        "/dizlee/notifications?tab=inbox",
      ),
    ).toBe("/dizlee/invoices?id=99");
  });

  it("routes Dizlee partner resubmit notifications to reports", () => {
    expect(
      resolveNotificationHref(
        "dizlee",
        {
          id: "6",
          subject: "Partner report resubmitted",
          metadataJson: JSON.stringify({
            type: "PARTNER_REPORT_RESUBMITTED",
            opcoId: "2",
            opcoName: "Zain KSA",
            partnerId: "27",
            partnerName: "Timwe",
            month: 9,
            year: 2026,
          }),
        },
        "/dizlee/notifications?tab=inbox",
      ),
    ).toBe("/dizlee/reports?opcoId=2&partnerId=27&month=9&year=2026");
  });
});
