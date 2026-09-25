import { describe, expect, it } from "vitest";

import { displayPartnerPreviewHeader } from "@/lib/partner/preview-headers";

describe("displayPartnerPreviewHeader", () => {
  it("normalizes Gross amount (LC)/(USD) to Gross amount", () => {
    expect(displayPartnerPreviewHeader("Gross amount (LC)")).toBe(
      "Gross amount",
    );
    expect(displayPartnerPreviewHeader("gross amount (lc)")).toBe(
      "Gross amount",
    );
    expect(displayPartnerPreviewHeader("Gross amount (USD)")).toBe(
      "Gross amount",
    );
  });

  it("normalizes Local Currency (LC) header", () => {
    expect(displayPartnerPreviewHeader("Local Currency (LC)")).toBe(
      "Local currency",
    );
  });

  it("leaves other headers unchanged", () => {
    expect(displayPartnerPreviewHeader("Service name")).toBe("Service name");
    expect(displayPartnerPreviewHeader("Currency")).toBe("Currency");
  });
});
