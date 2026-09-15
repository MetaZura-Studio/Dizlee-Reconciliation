import { describe, expect, it } from "vitest";

import { displayPartnerPreviewHeader } from "@/lib/partner/preview-headers";

describe("displayPartnerPreviewHeader", () => {
  it("rewrites Gross amount (LC) to USD", () => {
    expect(displayPartnerPreviewHeader("Gross amount (LC)")).toBe(
      "Gross amount (USD)",
    );
    expect(displayPartnerPreviewHeader("gross amount (lc)")).toBe(
      "Gross amount (USD)",
    );
  });

  it("leaves other headers unchanged", () => {
    expect(displayPartnerPreviewHeader("Service name")).toBe("Service name");
    expect(displayPartnerPreviewHeader("Gross amount (USD)")).toBe(
      "Gross amount (USD)",
    );
  });
});
