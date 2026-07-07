import { describe, expect, it } from "vitest";

import { isPartnerRole } from "@/lib/partner/auth";

describe("partner auth helpers", () => {
  it("identifies partner role", () => {
    expect(isPartnerRole("partner")).toBe(true);
    expect(isPartnerRole("admin")).toBe(false);
    expect(isPartnerRole("opco")).toBe(false);
    expect(isPartnerRole("client")).toBe(false);
  });
});
