import { describe, expect, it } from "vitest";

import {
  partnerInvoiceUploadMetadataSchema,
  validateInvoiceUploadFile,
} from "@/lib/partner/validation/invoice-upload";

describe("partner invoice upload validation", () => {
  it("accepts valid upload metadata", () => {
    const result = partnerInvoiceUploadMetadataSchema.safeParse({
      year: "2026",
      month: "7",
      invoiceNumber: "INV-1",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      year: 2026,
      month: 7,
      invoiceNumber: "INV-1",
    });
  });

  it("accepts metadata without invoice number", () => {
    const result = partnerInvoiceUploadMetadataSchema.safeParse({
      year: 2026,
      month: 7,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      year: 2026,
      month: 7,
    });
  });

  it("rejects non-pdf files", () => {
    const file = new File(["test"], "invoice.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    expect(validateInvoiceUploadFile(file)).toBe("Only .pdf files are supported");
  });

  it("accepts pdf files", () => {
    const file = new File(["test"], "invoice.pdf", { type: "application/pdf" });
    expect(validateInvoiceUploadFile(file)).toBeNull();
  });
});
