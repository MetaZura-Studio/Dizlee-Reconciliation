import { describe, expect, it } from "vitest";

import {
  createOpcoSchema,
  updateOpcoSchema,
} from "@/lib/admin/validation/opcos";
import {
  createPartnerSchema,
  updatePartnerSchema,
} from "@/lib/admin/validation/partners";
import {
  regulatoryFeePercentSchema,
  updateOpcoRegulatoryFeesSchema,
} from "@/lib/admin/validation/opco-regulatory-fees";

describe("admin OpCo validation", () => {
  it("accepts a valid create payload", () => {
    const result = createOpcoSchema.safeParse({
      name: "Zain Jordan",
      defaultCurrencyId: "1",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("requires name and currency id", () => {
    const result = createOpcoSchema.safeParse({
      name: "",
      defaultCurrencyId: "abc",
    });

    expect(result.success).toBe(false);
  });

  it("accepts an update payload", () => {
    const result = updateOpcoSchema.safeParse({
      name: "Zain Kuwait",
      defaultCurrencyId: "2",
      status: "INACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("ignores vatPercent on create (no longer accepted)", () => {
    const result = createOpcoSchema.safeParse({
      name: "Zain Jordan",
      defaultCurrencyId: "1",
      vatPercent: 5,
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(
        "vatPercent" in (result.data as Record<string, unknown>),
      ).toBe(false);
    }
  });
});

describe("admin OpCo regulatory fee validation", () => {
  it("accepts fee percent 0–100 with up to 2 decimals", () => {
    expect(regulatoryFeePercentSchema.safeParse(0).success).toBe(true);
    expect(regulatoryFeePercentSchema.safeParse(19.5).success).toBe(true);
    expect(regulatoryFeePercentSchema.safeParse(100).success).toBe(true);
  });

  it("rejects fee percent outside 0–100", () => {
    expect(regulatoryFeePercentSchema.safeParse(101).success).toBe(false);
    expect(regulatoryFeePercentSchema.safeParse(-1).success).toBe(false);
  });

  it("accepts batch updates", () => {
    const result = updateOpcoRegulatoryFeesSchema.safeParse({
      updates: [
        { mapId: "1", regulatoryFeePercent: 6 },
        { mapId: "2", regulatoryFeePercent: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("admin Partner validation", () => {
  it("accepts a valid create payload", () => {
    const result = createPartnerSchema.safeParse({
      name: "Spotify",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("accepts an update payload", () => {
    const result = updatePartnerSchema.safeParse({
      name: "Spotify",
      status: "INACTIVE",
    });

    expect(result.success).toBe(true);
  });
});
