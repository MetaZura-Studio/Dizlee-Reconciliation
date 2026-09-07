import { describe, expect, it } from "vitest";

import {
  isReportReuploadEligible,
  mapPartnerReportReuploadFlags,
} from "@/lib/partner/reupload/eligibility";

describe("partner report reupload eligibility", () => {
  it("allows reupload when report is change requested and request is approved", () => {
    const eligible = isReportReuploadEligible("CHANGE_REQUESTED", [
      {
        decidedAt: "2026-07-01T10:00:00.000Z",
        completedAt: null,
        statusCode: "APPROVED",
      },
    ]);

    expect(eligible).toBe(true);
  });

  it("blocks reupload when report is not change requested", () => {
    const eligible = isReportReuploadEligible("SUBMITTED", [
      {
        decidedAt: "2026-07-01T10:00:00.000Z",
        completedAt: null,
        statusCode: "APPROVED",
      },
    ]);

    expect(eligible).toBe(false);
  });

  it("blocks reupload when request is still pending", () => {
    const eligible = isReportReuploadEligible("CHANGE_REQUESTED", [
      {
        decidedAt: null,
        completedAt: null,
        statusCode: "PENDING",
      },
    ]);

    expect(eligible).toBe(false);
  });

  it("blocks reupload when request is already completed", () => {
    const eligible = isReportReuploadEligible("CHANGE_REQUESTED", [
      {
        decidedAt: "2026-07-01T10:00:00.000Z",
        completedAt: "2026-07-02T10:00:00.000Z",
        statusCode: "APPROVED",
      },
    ]);

    expect(eligible).toBe(false);
  });

  it("blocks reupload when request was rejected", () => {
    const eligible = isReportReuploadEligible("CHANGE_REQUESTED", [
      {
        decidedAt: "2026-07-01T10:00:00.000Z",
        completedAt: null,
        statusCode: "SUBMITTED",
      },
    ]);

    expect(eligible).toBe(false);
  });
});

describe("mapPartnerReportReuploadFlags", () => {
  it("allows requesting reupload for submitted report with no CR", () => {
    expect(mapPartnerReportReuploadFlags("SUBMITTED", [])).toEqual({
      hasPendingChangeRequest: false,
      canRequestReupload: true,
      canReupload: false,
      reuploadReason: null,
    });
  });

  it("marks pending CR and blocks new request", () => {
    expect(
      mapPartnerReportReuploadFlags("SUBMITTED", [
        {
          reason: "Fix amounts",
          decidedAt: null,
          completedAt: null,
          status: { code: "PENDING" },
        },
      ]),
    ).toEqual({
      hasPendingChangeRequest: true,
      canRequestReupload: false,
      canReupload: false,
      reuploadReason: "Fix amounts",
    });
  });

  it("unlocks corrected upload after approved CR", () => {
    expect(
      mapPartnerReportReuploadFlags("CHANGE_REQUESTED", [
        {
          reason: "Fix amounts",
          decidedAt: new Date("2026-07-01T10:00:00.000Z"),
          completedAt: null,
          status: { code: "APPROVED" },
        },
      ]),
    ).toEqual({
      hasPendingChangeRequest: false,
      canRequestReupload: false,
      canReupload: true,
      reuploadReason: "Fix amounts",
    });
  });
});
