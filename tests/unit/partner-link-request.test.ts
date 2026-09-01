import { describe, expect, it } from "vitest";

import {
  formatPartnerLinkRequestBody,
  parsePartnerLinkRequestBody,
  partnerLinkRequestSubject,
  stripPartnerLinkRequestMachinePrefix,
} from "@/lib/platform/partner-link-request";

describe("partner link request body", () => {
  it("formats a human-readable body without opcoId markers", () => {
    const record = {
      opcoId: "42",
      periodLabel: "04/2026",
      unlinkedPartnerNames: ["ArpuPlus"],
      unknownPartnerNames: ["Foo Corp"],
      message: "Please add these OpCo–Partner links so we can upload the report.",
    };
    const body = formatPartnerLinkRequestBody(record);
    expect(body).not.toContain("opcoId");
    expect(body).toContain("Partners not linked: ArpuPlus, Foo Corp");
    expect(partnerLinkRequestSubject("Zain Bahrain")).toBe(
      "Partner link request: Zain Bahrain",
    );
    expect(parsePartnerLinkRequestBody(body)).toEqual({
      opcoId: "",
      periodLabel: "04/2026",
      unlinkedPartnerNames: ["ArpuPlus", "Foo Corp"],
      unknownPartnerNames: [],
      message: "Please add these OpCo–Partner links so we can upload the report.",
    });
  });

  it("still parses the older two-line partner list with opcoId prefix", () => {
    const body = [
      "[opcoId=42]",
      "Period: 04/2026",
      "Unlinked partners: ArpuPlus",
      "Unknown names: Foo Corp",
      "",
      "Please add these OpCo–Partner links so we can upload the report.",
    ].join("\n");
    expect(parsePartnerLinkRequestBody(body)).toEqual({
      opcoId: "42",
      periodLabel: "04/2026",
      unlinkedPartnerNames: ["ArpuPlus"],
      unknownPartnerNames: ["Foo Corp"],
      message: "Please add these OpCo–Partner links so we can upload the report.",
    });
  });

  it("strips machine prefix for display", () => {
    expect(
      stripPartnerLinkRequestMachinePrefix(
        "[opcoId=2]\nPeriod: 08/2026\nPartners not linked: ArpuPlus",
      ),
    ).toBe("Period: 08/2026\nPartners not linked: ArpuPlus");
  });

  it("returns null when the body is not a link request", () => {
    expect(parsePartnerLinkRequestBody("Hello admin")).toBeNull();
  });
});
