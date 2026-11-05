import { describe, expect, it } from "vitest";

import {
  INVOICE_ATTACHMENT_TOO_LARGE_MESSAGE,
  MAX_INVOICE_ATTACHMENT_BYTES,
  MAX_INVOICE_ATTACHMENTS,
  validateInvoiceAttachmentFileMeta,
} from "@/lib/dizlee/invoice-attachments.shared";
import { createOpcoInvoiceBodySchema } from "@/lib/dizlee/validation/api-bodies";

describe("invoice attachment validation", () => {
  it("accepts any extension under the 20 MB cap", () => {
    expect(
      validateInvoiceAttachmentFileMeta({
        filename: "support.zip",
        size: 1024,
        clientMimeType: "application/zip",
      }),
    ).toEqual({
      filename: "support.zip",
      mimeType: "application/zip",
    });
  });

  it("accepts unknown types as octet-stream when client mime is empty", () => {
    expect(
      validateInvoiceAttachmentFileMeta({
        filename: "notes.docx",
        size: 8,
        clientMimeType: "",
      }).mimeType,
    ).toBe("application/octet-stream");
  });

  it("rejects empty files", () => {
    expect(() =>
      validateInvoiceAttachmentFileMeta({
        filename: "empty.bin",
        size: 0,
      }),
    ).toThrow("File is empty.");
  });

  it("rejects files over 20 MB", () => {
    expect(() =>
      validateInvoiceAttachmentFileMeta({
        filename: "big.bin",
        size: MAX_INVOICE_ATTACHMENT_BYTES + 1,
      }),
    ).toThrow(INVOICE_ATTACHMENT_TOO_LARGE_MESSAGE);
  });
});

describe("createOpcoInvoiceBodySchema attachments", () => {
  const base = {
    month: 8,
    year: 2026,
    opcoId: "5",
    lineItems: [{ description: "Service", quantity: 1, unitPrice: 100 }],
  };

  it("defaults missing attachmentFileIds to empty", () => {
    const parsed = createOpcoInvoiceBodySchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.attachmentFileIds).toEqual([]);
    }
  });

  it("accepts up to five attachment ids", () => {
    const parsed = createOpcoInvoiceBodySchema.safeParse({
      ...base,
      attachmentFileIds: ["1", "2", "3", "4", "5"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.attachmentFileIds).toHaveLength(MAX_INVOICE_ATTACHMENTS);
    }
  });

  it("rejects more than five attachment ids", () => {
    const parsed = createOpcoInvoiceBodySchema.safeParse({
      ...base,
      attachmentFileIds: ["1", "2", "3", "4", "5", "6"],
    });
    expect(parsed.success).toBe(false);
  });
});
