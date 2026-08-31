import { describe, expect, it } from "vitest";

import {
  OPCO_REPORTS_UPLOADED_SUBJECT,
  buildOpcoReportResubmittedBody,
  buildOpcoReportUploadBody,
  mergeOpcoReportUploadPartners,
  notificationCategory,
  opcoReportUploadGroupKey,
  parseNotificationMetadata,
  resolveNotificationAction,
  serializeNotificationMetadata,
} from "@/lib/platform/notification-metadata";
import { resolveNotificationHref } from "@/lib/platform/notification-deep-links";

describe("mergeOpcoReportUploadPartners", () => {
  it("appends a new partner and sorts by name", () => {
    expect(
      mergeOpcoReportUploadPartners(
        [{ id: "2", name: "Beta" }],
        { id: "1", name: "Alpha" },
      ),
    ).toEqual([
      { id: "1", name: "Alpha" },
      { id: "2", name: "Beta" },
    ]);
  });

  it("does not duplicate an existing partner id", () => {
    expect(
      mergeOpcoReportUploadPartners(
        [{ id: "1", name: "Alpha" }],
        { id: "1", name: "Alpha Updated" },
      ),
    ).toEqual([{ id: "1", name: "Alpha" }]);
  });
});

describe("buildOpcoReportUploadBody", () => {
  it("lists every partner name", () => {
    const body = buildOpcoReportUploadBody({
      opcoName: "Zain Bahrain",
      periodLabel: "August 2026",
      partners: [
        { id: "1", name: "Digital Virgo" },
        { id: "2", name: "Timwe" },
      ],
    });
    expect(body).toContain("2 partners");
    expect(body).toContain("- Digital Virgo");
    expect(body).toContain("- Timwe");
  });
});

describe("resolveNotificationAction", () => {
  it("returns View Reports for consolidated OpCo uploads", () => {
    const metadata = {
      type: "OPCO_REPORT_UPLOAD" as const,
      groupKey: opcoReportUploadGroupKey({ opcoId: "5", year: 2026, month: 8 }),
      opcoId: "5",
      opcoName: "Zain Bahrain",
      month: 8,
      year: 2026,
      partners: [{ id: "9", name: "Digital Virgo" }],
    };
    expect(resolveNotificationAction(metadata, OPCO_REPORTS_UPLOADED_SUBJECT)).toEqual({
      label: "View Reports",
      href: "/dizlee/reports?opcoId=5&month=8&year=2026",
    });
  });

  it("returns Open Reconciliation for OpCo resubmitted metadata", () => {
    expect(
      resolveNotificationAction(
        {
          type: "OPCO_REPORT_RESUBMITTED",
          opcoId: "5",
          opcoName: "Zain Bahrain",
          month: 8,
          year: 2026,
          partners: [{ id: "9", name: "Digital Virgo" }],
        },
        "OpCo monthly report resubmitted",
      ),
    ).toEqual({
      label: "Open Reconciliation",
      href: "/dizlee/reconciliation?opcoId=5&month=8&year=2026",
    });
  });

  it("returns View Request for reupload metadata", () => {
    expect(
      resolveNotificationAction(
        {
          type: "OPCO_REUPLOAD_REQUEST",
          opcoId: "5",
          opcoName: "Zain Bahrain",
          partnerId: "9",
          partnerName: "Digital Virgo",
          reportId: "100",
          changeRequestId: "200",
          month: 8,
          year: 2026,
        },
        "OpCo report reupload requested",
      ),
    ).toEqual({
      label: "View Request",
      href: "/dizlee/reports/reupload?opcoId=5&partnerId=9&month=8&year=2026",
    });
  });

  it("omits CTA for partner-link requests on Dizlee", () => {
    expect(
      resolveNotificationAction(
        { type: "PARTNER_LINK_REQUEST", opcoId: "5", opcoName: "Zain" },
        "Partner link request: Zain",
      ),
    ).toBeNull();
  });
});

describe("parseNotificationMetadata", () => {
  it("round-trips metadata JSON", () => {
    const metadata = {
      type: "PARTNER_REPORT_UPLOAD" as const,
      opcoId: "1",
      opcoName: "OpCo",
      partnerId: "2",
      partnerName: "Partner",
      month: 1,
      year: 2026,
    };
    expect(parseNotificationMetadata(serializeNotificationMetadata(metadata))).toEqual(
      metadata,
    );
  });

  it("returns null for invalid JSON", () => {
    expect(parseNotificationMetadata("{not-json")).toBeNull();
  });
});

describe("notificationCategory", () => {
  it("classifies by metadata type", () => {
    expect(
      notificationCategory(
        {
          type: "OPCO_REPORT_UPLOAD",
          groupKey: "x",
          opcoId: "1",
          opcoName: "A",
          month: 1,
          year: 2026,
          partners: [],
        },
        "anything",
      ),
    ).toBe("report");
  });
});

describe("resolveNotificationHref with metadata", () => {
  it("prefers metadata action for Dizlee report uploads", () => {
    const metadata = serializeNotificationMetadata({
      type: "OPCO_REPORT_UPLOAD",
      groupKey: opcoReportUploadGroupKey({ opcoId: "5", year: 2026, month: 8 }),
      opcoId: "5",
      opcoName: "Zain Bahrain",
      month: 8,
      year: 2026,
      partners: [{ id: "9", name: "Digital Virgo" }],
    });
    expect(
      resolveNotificationHref(
        "dizlee",
        {
          id: "1",
          subject: OPCO_REPORTS_UPLOADED_SUBJECT,
          metadataJson: metadata,
        },
        "/dizlee/notifications?tab=inbox",
      ),
    ).toBe("/dizlee/reports?opcoId=5&month=8&year=2026");
  });
});

describe("buildOpcoReportResubmittedBody", () => {
  it("states that period recon work was deleted and must be redone", () => {
    const body = buildOpcoReportResubmittedBody({
      opcoName: "Zain Bahrain",
      periodLabel: "August 2026",
      partners: [{ id: "9", name: "Digital Virgo" }],
    });
    expect(body).toContain(
      "All reconciliations, consolidation, and revenue-share results for this OpCo and period were deleted",
    );
    expect(body).toContain("must be redone from scratch");
    expect(body).toContain("Digital Virgo");
  });
});
