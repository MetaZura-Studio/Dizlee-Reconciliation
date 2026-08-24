import { describe, expect, it } from "vitest";

import {
  aggregateLinesByDescription,
  matchLinkedPartner,
  matchServiceMapRow,
  normalizeServiceKey,
} from "@/lib/platform/service-partner-map";

describe("normalizeServiceKey", () => {
  it("trims and lowercases with collapsed spaces", () => {
    expect(normalizeServiceKey("  Shofha   Plus ")).toBe("shofha plus");
  });
});

describe("matchServiceMapRow", () => {
  const maps = [
    { serviceKey: "premiumgames", serviceName: "PremiumGames" },
    { serviceKey: "klikomicssub", serviceName: "KlikomicsSub" },
  ];

  it("matches spaced and concatenated service names", () => {
    expect(
      matchServiceMapRow(
        { serviceKey: "premium games", serviceName: "Premium Games" },
        maps,
      )?.serviceName,
    ).toBe("PremiumGames");
  });

  it("does not treat a shorter partner-like name as a different service key", () => {
    expect(
      matchServiceMapRow(
        { serviceKey: "klikomics", serviceName: "Klikomics" },
        maps,
      ),
    ).toBeNull();
  });
});

describe("matchLinkedPartner", () => {
  const linked = [
    { name: "DigitalVirgo" },
    { name: "DotConvertecs" },
    { name: "MobiMind" },
    { name: "Docomo Digital" },
  ];

  it("matches spaced and prefixed Excel partner labels", () => {
    expect(matchLinkedPartner("Digital Virgo", linked)?.name).toBe("DigitalVirgo");
    expect(matchLinkedPartner("Dotconvertecs-iTunes", linked)?.name).toBe(
      "DotConvertecs",
    );
    expect(matchLinkedPartner("Dizlee MobiMind", linked)?.name).toBe("MobiMind");
    expect(matchLinkedPartner("Docomo", linked)?.name).toBe("Docomo Digital");
  });

  it("returns null for unknown labels", () => {
    expect(matchLinkedPartner("Dizlee-DOB-Playou-Ecommerce", linked)).toBeNull();
  });
});

describe("aggregateLinesByDescription", () => {
  it("sums amounts for the same service/description across days", () => {
    const aggregated = aggregateLinesByDescription([
      {
        serviceKey: "shofha plus",
        serviceName: "Shofha Plus",
        description: "Shofha Plus — daily",
        amount: 10,
        revenueSharePercent: 30,
        lineNumber: 1,
        sourceColumns: {},
      },
      {
        serviceKey: "shofha plus",
        serviceName: "Shofha Plus",
        description: "Shofha Plus — daily",
        amount: 15.5,
        revenueSharePercent: 30,
        lineNumber: 2,
        sourceColumns: {},
      },
      {
        serviceKey: "other",
        serviceName: "Other",
        description: "Other",
        amount: 3,
        revenueSharePercent: null,
        lineNumber: 3,
        sourceColumns: {},
      },
    ]);

    expect(aggregated).toHaveLength(2);
    const shofha = aggregated.find((row) => row.serviceKey === "shofha plus");
    expect(shofha?.amount).toBe(25.5);
    expect(shofha?.lineNumber).toBe(1);
  });
});
