import { describe, expect, it } from "vitest";

import {
  decimalPrecisionForCurrency,
  formatMoney,
  formatUsd,
  roundMoney,
} from "@/lib/platform/format-money";

describe("decimalPrecisionForCurrency", () => {
  it("uses seeded precision for known currencies", () => {
    expect(decimalPrecisionForCurrency("USD")).toBe(2);
    expect(decimalPrecisionForCurrency("SAR")).toBe(2);
    expect(decimalPrecisionForCurrency("KWD")).toBe(3);
    expect(decimalPrecisionForCurrency("BHD")).toBe(3);
    expect(decimalPrecisionForCurrency("JOD")).toBe(3);
    expect(decimalPrecisionForCurrency("IQD")).toBe(3);
    expect(decimalPrecisionForCurrency("SSP")).toBe(2);
  });

  it("defaults unknown currencies to 2", () => {
    expect(decimalPrecisionForCurrency("XYZ")).toBe(2);
  });
});

describe("formatMoney", () => {
  it("formats USD up to 2 fraction digits and trims trailing zeros", () => {
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.5");
    expect(formatMoney(1234.56, "USD")).toBe("$1,234.56");
    expect(formatMoney(1234, "USD")).toBe("$1,234");
  });

  it("formats KWD up to 3 fraction digits and trims trailing zeros", () => {
    expect(formatMoney(1234.5678, "KWD", { style: "decimal" })).toBe(
      "1,234.568",
    );
    expect(formatMoney(890400, "IQD", { style: "decimal" })).toBe("890,400");
  });
});

describe("roundMoney", () => {
  it("rounds to currency precision", () => {
    expect(roundMoney(1.2345, "USD")).toBe(1.23);
    expect(roundMoney(1.2345, "KWD")).toBe(1.235);
  });
});

describe("formatUsd", () => {
  it("always uses USD precision", () => {
    expect(formatUsd(10)).toBe("$10");
    expect(formatUsd(10.5)).toBe("$10.5");
    expect(formatUsd(null)).toBe("—");
  });
});
