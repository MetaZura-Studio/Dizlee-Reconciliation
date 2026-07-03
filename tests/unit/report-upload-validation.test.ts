import { describe, expect, it } from "vitest";

import {
  reportUploadMetadataSchema,
  validateReportUploadFile,
} from "@/lib/opco/validation/report-upload";

describe("report upload validation", () => {
  it("accepts valid upload metadata", () => {
    const result = reportUploadMetadataSchema.safeParse({
      partnerId: "1",
      year: "2026",
      month: "7",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      partnerId: "1",
      year: 2026,
      month: 7,
    });
  });

  it("rejects invalid month values", () => {
    const result = reportUploadMetadataSchema.safeParse({
      partnerId: "1",
      year: 2026,
      month: 13,
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-xlsx files", () => {
    const file = new File(["test"], "report.pdf", { type: "application/pdf" });
    expect(validateReportUploadFile(file)).toBe("Only .xlsx files are supported");
  });

  it("accepts xlsx files", () => {
    const file = new File(["test"], "report.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    expect(validateReportUploadFile(file)).toBeNull();
  });
});
