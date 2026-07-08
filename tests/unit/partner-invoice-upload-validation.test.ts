import { describe, expect, it } from "vitest";

import {
  partnerInvoiceUploadMetadataSchema,
  validateInvoiceUploadFile,
} from "@/lib/partner/validation/invoice-upload";

describe("partner invoice upload validation", () => {
  it("accepts valid upload metadata", () => {
    const result = partnerInvoiceUploadMetadataSchema.safeParse({
      opcoId: "1",
      year: "2026",
      month: "7",
      lineItems: [{ description: "Platform fees", quantity: 1, unitPrice: 1500 }],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      opcoId: "1",
      year: 2026,
      month: 7,
      lineItems: [{ description: "Platform fees", quantity: 1, unitPrice: 1500 }],
    });
  });

  it("rejects empty line items", () => {
    const result = partnerInvoiceUploadMetadataSchema.safeParse({
      opcoId: "1",
      year: 2026,
      month: 7,
      lineItems: [],
    });

    expect(result.success).toBe(false);
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
