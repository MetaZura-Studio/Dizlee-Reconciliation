import { describe, expect, it } from "vitest";

import { assertPdfBufferMagic } from "@/lib/partner/validation/invoice-upload";

describe("assertPdfBufferMagic", () => {
  it("accepts a buffer that starts with %PDF-", () => {
    const buffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n");
    expect(assertPdfBufferMagic(buffer)).toBeNull();
  });

  it("rejects non-PDF content", () => {
    const buffer = Buffer.from("PK\u0003\u0004not-a-pdf");
    expect(assertPdfBufferMagic(buffer)).toBe(
      "File content is not a valid PDF",
    );
  });

  it("rejects empty buffers", () => {
    expect(assertPdfBufferMagic(Buffer.alloc(0))).toBe("Uploaded file is empty");
  });
});
