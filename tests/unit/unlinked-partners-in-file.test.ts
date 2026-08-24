import { describe, expect, it } from "vitest";

import {
  classifyExcelColumnPartnerNames,
  classifyServiceMapPartners,
} from "@/lib/opco/queries/unlinked-partners-in-file";
import {
  hasUnlinkedPartnersInFile,
  notLinkedPartnerDisplayNames,
  parseUnlinkedPartnersDetails,
} from "@/lib/opco/unlinked-partners-in-file.shared";

describe("classifyExcelColumnPartnerNames", () => {
  const linked = [{ id: BigInt(1), name: "DigitalVirgo" }];
  const allPartners = [
    { id: BigInt(1), name: "DigitalVirgo" },
    { id: BigInt(2), name: "ArpuPlus" },
  ];

  it("ignores names that match a linked partner", () => {
    expect(
      classifyExcelColumnPartnerNames({
        excelNames: ["Digital Virgo", "DigitalVirgo"],
        linked,
        allPartners,
      }),
    ).toEqual({ unlinkedPartnerNames: [], unknownPartnerNames: [] });
  });

  it("lists known partners that are not linked", () => {
    expect(
      classifyExcelColumnPartnerNames({
        excelNames: ["Arpu Plus", "ArpuPlus"],
        linked,
        allPartners,
      }),
    ).toEqual({
      unlinkedPartnerNames: ["ArpuPlus"],
      unknownPartnerNames: [],
    });
  });

  it("lists unknown labels separately", () => {
    expect(
      classifyExcelColumnPartnerNames({
        excelNames: ["Foo Corp"],
        linked,
        allPartners,
      }),
    ).toEqual({
      unlinkedPartnerNames: [],
      unknownPartnerNames: ["Foo Corp"],
    });
  });
});

describe("classifyServiceMapPartners", () => {
  it("treats unmapped services as unknown and unlinked mapped partners as unlinked", () => {
    const result = classifyServiceMapPartners({
      lines: [
        { serviceKey: "games", serviceName: "Games" },
        { serviceKey: "tv", serviceName: "TV" },
        { serviceKey: "tv", serviceName: "TV again" },
      ],
      maps: [
        {
          serviceKey: "games",
          partnerId: BigInt(9),
          partnerName: "GameMine",
          partnerDeleted: false,
        },
      ],
      linkedPartnerIds: new Set(["1"]),
    });
    expect(result).toEqual({
      unlinkedPartnerNames: ["GameMine"],
      unknownPartnerNames: ["TV"],
    });
    expect(hasUnlinkedPartnersInFile(result)).toBe(true);
  });

  it("treats deleted mapped partners as unknown", () => {
    expect(
      classifyServiceMapPartners({
        lines: [{ serviceKey: "games", serviceName: "Games" }],
        maps: [
          {
            serviceKey: "games",
            partnerId: BigInt(1),
            partnerName: "GameMine",
            partnerDeleted: true,
          },
        ],
        linkedPartnerIds: new Set(["1"]),
      }),
    ).toEqual({
      unlinkedPartnerNames: [],
      unknownPartnerNames: ["GameMine"],
    });
  });

  it("accepts mapped partners that are linked", () => {
    expect(
      classifyServiceMapPartners({
        lines: [{ serviceKey: "games", serviceName: "Games" }],
        maps: [
          {
            serviceKey: "games",
            partnerId: BigInt(1),
            partnerName: "GameMine",
            partnerDeleted: false,
          },
        ],
        linkedPartnerIds: new Set(["1"]),
      }),
    ).toEqual({ unlinkedPartnerNames: [], unknownPartnerNames: [] });
  });

  it("treats Premium Games and PremiumGames as the same mapped service", () => {
    expect(
      classifyServiceMapPartners({
        lines: [
          { serviceKey: "premium games", serviceName: "Premium Games" },
          { serviceKey: "premiumgames", serviceName: "PremiumGames" },
        ],
        maps: [
          {
            serviceKey: "premiumgames",
            serviceName: "PremiumGames",
            partnerId: BigInt(8),
            partnerName: "Novustech",
            partnerDeleted: false,
          },
        ],
        linkedPartnerIds: new Set(["8"]),
      }),
    ).toEqual({ unlinkedPartnerNames: [], unknownPartnerNames: [] });
  });

  it("treats Klikomics and KlikomicsSub as two services from the same partner", () => {
    expect(
      classifyServiceMapPartners({
        lines: [
          { serviceKey: "klikomics", serviceName: "Klikomics" },
          { serviceKey: "klikomicssub", serviceName: "KlikomicsSub" },
        ],
        maps: [
          {
            serviceKey: "klikomics",
            serviceName: "Klikomics",
            partnerId: BigInt(59),
            partnerName: "Klikomics",
            partnerDeleted: false,
          },
          {
            serviceKey: "klikomicssub",
            serviceName: "KlikomicsSub",
            partnerId: BigInt(59),
            partnerName: "Klikomics",
            partnerDeleted: false,
          },
        ],
        linkedPartnerIds: new Set(["59"]),
        allPartners: [{ id: BigInt(59), name: "Klikomics" }],
      }),
    ).toEqual({ unlinkedPartnerNames: [], unknownPartnerNames: [] });
  });
});

describe("parseUnlinkedPartnersDetails", () => {
  it("reads 409 details from the upload error envelope", () => {
    expect(
      parseUnlinkedPartnersDetails({
        error: { key: "OPCO_UNLINKED_PARTNERS_IN_FILE" },
        details: {
          unlinkedPartnerNames: ["ArpuPlus"],
          unknownPartnerNames: ["Foo"],
        },
      }),
    ).toEqual({
      unlinkedPartnerNames: ["ArpuPlus"],
      unknownPartnerNames: ["Foo"],
    });
  });

  it("returns null for other errors", () => {
    expect(
      parseUnlinkedPartnersDetails({
        error: { key: "VALIDATION_FAILED" },
        details: { unlinkedPartnerNames: ["ArpuPlus"] },
      }),
    ).toBeNull();
  });
});

describe("notLinkedPartnerDisplayNames", () => {
  it("lists partners once and ignores spaced vs concatenated duplicates", () => {
    expect(
      notLinkedPartnerDisplayNames({
        unlinkedPartnerNames: ["Novustech"],
        unknownPartnerNames: ["Premium Games", "PremiumGames"],
      }),
    ).toEqual(["Novustech", "Premium Games"]);
  });
});
