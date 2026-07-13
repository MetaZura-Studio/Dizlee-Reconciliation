import { describe, expect, it } from "vitest";

import {
  createOpcoSchema,
  updateOpcoSchema,
} from "@/lib/admin/validation/opcos";
import {
  createPartnerSchema,
  updatePartnerSchema,
} from "@/lib/admin/validation/partners";

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
});

describe("admin Partner validation", () => {
  it("accepts a valid create payload", () => {
    const result = createPartnerSchema.safeParse({
      name: "Spotify",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("requires a name", () => {
    const result = createPartnerSchema.safeParse({
      name: "   ",
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
  });

  it("accepts an update payload", () => {
    const result = updatePartnerSchema.safeParse({
      name: "Netflix",
      status: "INACTIVE",
    });

    expect(result.success).toBe(true);
  });
});
