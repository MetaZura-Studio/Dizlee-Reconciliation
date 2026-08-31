import { describe, expect, it } from "vitest";

import {
  fingerprintPartnerLines,
  partnerLinesChanged,
  type FingerprintableLine,
} from "@/lib/platform/reconciliation/partner-line-fingerprint";

const baseLine = (
  overrides: Partial<FingerprintableLine> = {},
): FingerprintableLine => ({
  description: "Voice",
  lineNumber: 1,
  amount: 100,
  usageAmount: 10,
  usageUsd: 100,
  revenueSharePercent: 30,
  reconciliationBasis: "GROSS",
  usageUnit: "min",
  ...overrides,
});

describe("partner line fingerprint", () => {
  it("matches when lines are identical", () => {
    const a = [baseLine()];
    const b = [baseLine()];
    expect(partnerLinesChanged(a, b)).toBe(false);
    expect(fingerprintPartnerLines(a)).toBe(fingerprintPartnerLines(b));
  });

  it("ignores line order", () => {
    const a = [baseLine({ description: "A", lineNumber: 1 }), baseLine({ description: "B", lineNumber: 2, amount: 50 })];
    const b = [baseLine({ description: "B", lineNumber: 2, amount: 50 }), baseLine({ description: "A", lineNumber: 1 })];
    expect(partnerLinesChanged(a, b)).toBe(false);
  });

  it("detects amount changes", () => {
    expect(
      partnerLinesChanged([baseLine({ amount: 100 })], [baseLine({ amount: 101 })]),
    ).toBe(true);
  });

  it("detects added or removed lines", () => {
    expect(partnerLinesChanged([baseLine()], [baseLine(), baseLine({ description: "SMS", lineNumber: 2 })])).toBe(
      true,
    );
    expect(partnerLinesChanged([baseLine()], [])).toBe(true);
  });

  it("normalizes decimal-like equality via fixed precision", () => {
    expect(
      partnerLinesChanged(
        [baseLine({ amount: 10.5 })],
        [baseLine({ amount: 10.5000001 })],
      ),
    ).toBe(false);
  });
});
