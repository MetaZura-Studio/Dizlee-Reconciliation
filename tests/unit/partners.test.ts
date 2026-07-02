import { describe, expect, it } from "vitest";

import { mapLinkedPartners } from "@/lib/opco/queries/partners";

describe("linked partners mapping", () => {
  it("maps partner links to dropdown options", () => {
    const result = mapLinkedPartners([
      {
        partnerId: BigInt(2),
        partner: { id: BigInt(2), name: "Beta Partner" },
      },
      {
        partnerId: BigInt(1),
        partner: { id: BigInt(1), name: "Alpha Partner" },
      },
    ]);

    expect(result).toEqual([
      { id: "2", name: "Beta Partner" },
      { id: "1", name: "Alpha Partner" },
    ]);
  });

  it("returns an empty array when no links exist", () => {
    expect(mapLinkedPartners([])).toEqual([]);
  });
});
