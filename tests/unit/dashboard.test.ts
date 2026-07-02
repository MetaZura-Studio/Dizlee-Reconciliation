import { describe, expect, it } from "vitest";

import { parseDashboardPeriod } from "@/lib/opco/period";
import { mapReportStatusToSubmissionStatus } from "@/lib/opco/queries/dashboard";

describe("dashboard period helpers", () => {
  it("uses current period by default", () => {
    const result = parseDashboardPeriod(undefined, undefined, new Date("2026-07-15"));

    expect(result).toEqual({ year: 2026, month: 7 });
  });

  it("falls back for invalid period params", () => {
    const result = parseDashboardPeriod("abc", "99", new Date("2026-03-01"));

    expect(result).toEqual({ year: 2026, month: 3 });
  });

  it("accepts valid period params", () => {
    const result = parseDashboardPeriod("2025", "11", new Date("2026-03-01"));

    expect(result).toEqual({ year: 2025, month: 11 });
  });
});

describe("dashboard submission status mapping", () => {
  it("maps submitted report statuses", () => {
    expect(mapReportStatusToSubmissionStatus("SUBMITTED")).toBe("submitted");
    expect(mapReportStatusToSubmissionStatus("RESUBMITTED")).toBe("submitted");
    expect(mapReportStatusToSubmissionStatus("APPROVED")).toBe("submitted");
  });

  it("maps actionable report statuses", () => {
    expect(mapReportStatusToSubmissionStatus("CHANGE_REQUESTED")).toBe(
      "change_requested",
    );
    expect(mapReportStatusToSubmissionStatus("PENDING")).toBe("pending");
  });

  it("treats missing status as not submitted", () => {
    expect(mapReportStatusToSubmissionStatus(undefined)).toBe("missing");
  });
});
