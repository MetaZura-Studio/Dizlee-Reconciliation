/**
 * Excel OpCo–Partner roster alias merge.
 */

import { describe, expect, it } from "vitest";

import {
  canonicalOpcoName,
  canonicalPartnerName,
  normalizeOrgKey,
  slugifyPartnerName,
} from "@/lib/platform/opco-partner-roster";

describe("opco-partner-roster", () => {
  it("maps ZainKSA to Zain KSA", () => {
    expect(canonicalOpcoName("ZainKSA")).toBe("Zain KSA");
    expect(normalizeOrgKey("Zain KSA")).toBe("zainksa");
  });

  it("merges partner spelling variants onto Admin names", () => {
    const existing = ["Marvel Media", "MDG", "Qadisha Group", "samMedia"];
    expect(canonicalPartnerName("MarvelMedia", existing)).toBe("Marvel Media");
    expect(canonicalPartnerName("MediaDigitalGroup (MDG)", existing)).toBe(
      "MDG",
    );
    expect(canonicalPartnerName("qadishaGroup", existing)).toBe(
      "Qadisha Group",
    );
    expect(canonicalPartnerName("SamMedia", existing)).toBe("samMedia");
    expect(canonicalPartnerName("DOCOMO", existing)).toBe("Docomo Digital");
  });

  it("keeps unknown Excel names for create", () => {
    expect(canonicalPartnerName("ZoodMall", [])).toBe("ZoodMall");
    expect(slugifyPartnerName("ZainBH OTTs")).toBe("zainbh-otts");
    expect(slugifyPartnerName("ZainSD_CP")).toBe("zainsd-cp");
  });
});
