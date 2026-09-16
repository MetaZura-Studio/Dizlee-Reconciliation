import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { isOpcoReportMappingConfigured } from "@/lib/admin/opco-report-mappings.shared";
import { getErrorDefinition } from "@/lib/errors/catalog";
import {
  formatReportMapReadyBody,
  formatReportMapRequestBody,
  REPORT_MAP_READY_SUBJECT,
  reportMapRequestSubject,
} from "@/lib/platform/report-map-request";

describe("isOpcoReportMappingConfigured", () => {
  const ready = {
    sampleSheetName: "Sheet1",
    serviceColumn: "Service",
    revenueColumn: "Revenue",
    revenueShareColumn: "RS %",
    partnerMode: "EXCEL_COLUMN",
    partnerColumn: "Partner",
  };

  it("returns true when all required columns are set for Excel partner mode", () => {
    expect(isOpcoReportMappingConfigured(ready)).toBe(true);
  });

  it("returns false when sheet or required columns are missing", () => {
    expect(
      isOpcoReportMappingConfigured({ ...ready, sampleSheetName: null }),
    ).toBe(false);
    expect(
      isOpcoReportMappingConfigured({ ...ready, revenueShareColumn: "" }),
    ).toBe(false);
    expect(
      isOpcoReportMappingConfigured({ ...ready, partnerColumn: null }),
    ).toBe(false);
  });

  it("does not require partner column for SERVICE_PARTNER_MAP mode", () => {
    expect(
      isOpcoReportMappingConfigured({
        ...ready,
        partnerMode: "SERVICE_PARTNER_MAP",
        partnerColumn: null,
      }),
    ).toBe(true);
  });
});

describe("OPCO_REPORT_MAPPING_NOT_READY catalog", () => {
  it("exposes a clear 400 definition for the upload gate", () => {
    const def = getErrorDefinition("OPCO_REPORT_MAPPING_NOT_READY");
    expect(def.status).toBe(400);
    expect(def.message).toMatch(/REPORT MAPPING NOT CONFIGURED/i);
  });
});

describe("report map request copy", () => {
  it("builds Admin request subject and body", () => {
    expect(reportMapRequestSubject("Zain Kuwait")).toBe(
      "Report map request: Zain Kuwait",
    );
    const body = formatReportMapRequestBody({
      opcoName: "Zain Kuwait",
      message: "Please set columns for our monthly file.",
    });
    expect(body).toContain("Report map is not configured for Zain Kuwait.");
    expect(body).toContain(
      "They requested mapping so they can upload monthly reports.",
    );
    expect(body).toContain(
      "Note from OpCo: Please set columns for our monthly file.",
    );
    expect(
      formatReportMapRequestBody({ opcoName: "Zain Kuwait" }),
    ).not.toContain("Note from OpCo");
  });

  it("builds OpCo ready notification copy", () => {
    expect(REPORT_MAP_READY_SUBJECT).toBe("Report mapping is ready");
    expect(formatReportMapReadyBody("Zain Kuwait")).toContain(
      "Report map for Zain Kuwait is configured.",
    );
    expect(formatReportMapReadyBody("Zain Kuwait")).toContain(
      "You can upload your monthly report now.",
    );
  });
});

describe("parse-preview has no generic-parse fallback", () => {
  it("uses hard mapped parseOpcoMonthlyPartnerBuckets only", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "app/api/opco/reports/parse-preview/route.ts",
      ),
      "utf8",
    );
    expect(source).toContain("parseOpcoMonthlyPartnerBuckets");
    expect(source).not.toMatch(/parseReport\b|parseGeneric|readRawExcel/);
  });
});
