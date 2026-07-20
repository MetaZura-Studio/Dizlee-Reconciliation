import { describe, expect, it } from "vitest";

import {
  createCurrencySchema,
  updateCurrencySchema,
} from "@/lib/admin/validation/currencies";
import { saveCurrencyRatesSchema } from "@/lib/admin/validation/currency-rates";
import { computeRateSavePlan } from "@/lib/platform/currency-rates";

describe("currency validation", () => {
  it("accepts valid create input", () => {
    const result = createCurrencySchema.safeParse({
      isoCode: "chf",
      symbol: "CHF",
      decimalPrecision: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isoCode).toBe("CHF");
    }
  });

  it("rejects invalid ISO codes", () => {
    const result = createCurrencySchema.safeParse({
      isoCode: "12",
      decimalPrecision: 2,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid update input", () => {
    const result = updateCurrencySchema.safeParse({
      symbol: "€",
      decimalPrecision: 2,
    });
    expect(result.success).toBe(true);
  });
});

describe("currency rates validation", () => {
  it("accepts valid monthly rate save payload", () => {
    const result = saveCurrencyRatesSchema.safeParse({
      month: 1,
      year: 2026,
      rates: [
        { currencyId: "1", rateToUsd: 1 },
        { currencyId: "2", rateToUsd: 0.308 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid rates", () => {
    const result = saveCurrencyRatesSchema.safeParse({
      month: 1,
      year: 2026,
      rates: [{ currencyId: "2", rateToUsd: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("allows null rate to clear a currency", () => {
    const result = saveCurrencyRatesSchema.safeParse({
      month: 6,
      year: 2026,
      rates: [{ currencyId: "2", rateToUsd: null }],
    });
    expect(result.success).toBe(true);
  });
});

describe("computeRateSavePlan", () => {
  const currencies = [
    { id: "1", isoCode: "KWD" },
    { id: "2", isoCode: "EUR" },
    { id: "3", isoCode: "GBP" },
  ];

  it("forces KWD to 1 and upserts other provided rates", () => {
    const plan = computeRateSavePlan({
      currencies,
      submittedRates: [
        { currencyId: "1", rateToUsd: 99 },
        { currencyId: "2", rateToUsd: 0.334 },
      ],
    });

    expect(plan.toUpsert).toEqual([
      { currencyId: "1", rateToUsd: 1 },
      { currencyId: "2", rateToUsd: 0.334 },
    ]);
    expect(plan.toSoftDelete).toEqual([]);
    expect(plan.updated).toBe(2);
  });

  it("soft-deletes rates cleared in submission", () => {
    const plan = computeRateSavePlan({
      currencies,
      submittedRates: [
        { currencyId: "2", rateToUsd: null },
        { currencyId: "3", rateToUsd: 0.39 },
      ],
    });

    expect(plan.toSoftDelete).toEqual(["2"]);
    expect(plan.toUpsert).toEqual([{ currencyId: "3", rateToUsd: 0.39 }]);
    expect(plan.cleared).toBe(1);
  });
});
