import { describe, expect, it } from "vitest";

import {
  getOpcoPartnerLinksSchema,
  saveOpcoPartnerLinksSchema,
} from "@/lib/admin/validation/opco-partner-links";
import {
  computeLinkDiff,
  isLinkableOpcoName,
} from "@/lib/platform/opco-partner-links";

describe("opco partner links validation", () => {
  it("accepts valid get request input", () => {
    const result = getOpcoPartnerLinksSchema.safeParse({ opcoId: "4" });
    expect(result.success).toBe(true);
  });

  it("rejects blank opco id", () => {
    const result = getOpcoPartnerLinksSchema.safeParse({ opcoId: "  " });
    expect(result.success).toBe(false);
  });

  it("accepts save with partner ids including empty list", () => {
    const result = saveOpcoPartnerLinksSchema.safeParse({
      opcoId: "4",
      partnerIds: ["1", "2"],
    });
    expect(result.success).toBe(true);

    const empty = saveOpcoPartnerLinksSchema.safeParse({
      opcoId: "4",
      partnerIds: [],
    });
    expect(empty.success).toBe(true);
  });

  it("rejects invalid partner ids in save payload", () => {
    const result = saveOpcoPartnerLinksSchema.safeParse({
      opcoId: "4",
      partnerIds: [""],
    });
    expect(result.success).toBe(false);
  });
});

describe("isLinkableOpcoName", () => {
  it("allows normal opco names", () => {
    expect(isLinkableOpcoName("Zain Jordan")).toBe(true);
    expect(isLinkableOpcoName("  Spotify OpCo  ")).toBe(true);
  });

  it("rejects reserved aggregate opco names", () => {
    expect(isLinkableOpcoName("opco_all")).toBe(false);
    expect(isLinkableOpcoName("OPCO_ALL")).toBe(false);
    expect(isLinkableOpcoName("opco all")).toBe(false);
    expect(isLinkableOpcoName("  OpCo All  ")).toBe(false);
  });
});

describe("computeLinkDiff", () => {
  const allPartnerIds = ["1", "2", "3", "4", "5"];

  it("computes additions when partners are newly selected", () => {
    const diff = computeLinkDiff({
      allPartnerIds,
      currentlyLinkedIds: ["1", "2"],
      selectedPartnerIds: ["1", "2", "3", "4"],
    });

    expect(diff.toActivate).toEqual(["1", "2", "3", "4"]);
    expect(diff.toSoftDelete).toEqual([]);
    expect(diff.added).toBe(2);
    expect(diff.removed).toBe(0);
  });

  it("computes removals when partners are unchecked", () => {
    const diff = computeLinkDiff({
      allPartnerIds,
      currentlyLinkedIds: ["1", "2", "3"],
      selectedPartnerIds: ["2"],
    });

    expect(diff.toActivate).toEqual(["2"]);
    expect(diff.toSoftDelete).toEqual(["1", "3"]);
    expect(diff.added).toBe(0);
    expect(diff.removed).toBe(2);
  });

  it("allows saving with zero linked partners", () => {
    const diff = computeLinkDiff({
      allPartnerIds,
      currentlyLinkedIds: ["1", "2"],
      selectedPartnerIds: [],
    });

    expect(diff.toActivate).toEqual([]);
    expect(diff.toSoftDelete).toEqual(["1", "2"]);
    expect(diff.added).toBe(0);
    expect(diff.removed).toBe(2);
  });

  it("restores previously linked partners without counting as added", () => {
    const diff = computeLinkDiff({
      allPartnerIds,
      currentlyLinkedIds: ["1"],
      selectedPartnerIds: ["1", "3"],
    });

    expect(diff.toActivate).toEqual(["1", "3"]);
    expect(diff.toSoftDelete).toEqual([]);
    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(0);
  });

  it("ignores selected ids that are not in the master partner list", () => {
    const diff = computeLinkDiff({
      allPartnerIds,
      currentlyLinkedIds: ["1"],
      selectedPartnerIds: ["1", "99"],
    });

    expect(diff.toActivate).toEqual(["1"]);
    expect(diff.toSoftDelete).toEqual([]);
    expect(diff.added).toBe(0);
    expect(diff.removed).toBe(0);
  });
});
