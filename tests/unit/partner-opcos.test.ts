import { describe, expect, it } from "vitest";

import { mapLinkedOpcos } from "@/lib/partner/queries/opcos";

describe("linked opcos mapping", () => {
  it("maps opco links to dropdown options", () => {
    const result = mapLinkedOpcos([
      {
        opcoId: BigInt(2),
        opco: { id: BigInt(2), name: "Zain KSA" },
      },
      {
        opcoId: BigInt(1),
        opco: { id: BigInt(1), name: "Zain Kuwait" },
      },
    ]);

    expect(result).toEqual([
      { id: "2", name: "Zain KSA" },
      { id: "1", name: "Zain Kuwait" },
    ]);
  });

  it("returns an empty array when no links exist", () => {
    expect(mapLinkedOpcos([])).toEqual([]);
  });
});
