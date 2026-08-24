import { describe, expect, it } from "vitest";

import {
  formatPartnerLinkRequestBody,
  parsePartnerLinkRequestBody,
  partnerLinkRequestBodyPrefix,
  partnerLinkRequestSubject,
} from "@/lib/platform/partner-link-request";

describe("partner link request body", () => {
  it("round-trips opco id, period, names, and message", () => {
    const record = {
      opcoId: "42",
      periodLabel: "April 2026",
      unlinkedPartnerNames: ["ArpuPlus"],
      unknownPartnerNames: ["Foo Corp"],
      message: "Please add these OpCo–Partner links so we can upload the report.",
    };
    const body = formatPartnerLinkRequestBody(record);
    expect(body.startsWith(partnerLinkRequestBodyPrefix("42"))).toBe(true);
    expect(body).toContain("Partners not linked: ArpuPlus, Foo Corp");
    expect(partnerLinkRequestSubject("Zain Bahrain")).toBe(
      "Partner link request: Zain Bahrain",
    );
    expect(parsePartnerLinkRequestBody(body)).toEqual({
      opcoId: "42",
      periodLabel: "April 2026",
      unlinkedPartnerNames: ["ArpuPlus", "Foo Corp"],
      unknownPartnerNames: [],
      message: "Please add these OpCo–Partner links so we can upload the report.",
    });
  });

  it("still parses the older two-line partner list", () => {
    const body = [
      "[opcoId=42]",
      "Period: April 2026",
      "Unlinked partners: ArpuPlus",
      "Unknown names: Foo Corp",
      "",
      "Please add these OpCo–Partner links so we can upload the report.",
    ].join("\n");
    expect(parsePartnerLinkRequestBody(body)).toEqual({
      opcoId: "42",
      periodLabel: "April 2026",
      unlinkedPartnerNames: ["ArpuPlus"],
      unknownPartnerNames: ["Foo Corp"],
      message: "Please add these OpCo–Partner links so we can upload the report.",
    });
  });

  it("returns null when the body is not a link request", () => {
    expect(parsePartnerLinkRequestBody("Hello admin")).toBeNull();
  });
});
