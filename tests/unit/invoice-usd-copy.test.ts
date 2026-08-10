import { describe, expect, it } from "vitest";

import {
  convertInvoiceLinesToUsd,
  resolveRateToUsd,
} from "@/lib/dizlee/invoice-usd-copy";

describe("invoice USD copy helpers", () => {
  it("converts line amounts with the FX rate", () => {
    const converted = convertInvoiceLinesToUsd(
      [
        { description: "Service A", quantity: 2, unitPrice: 10 },
        { description: "Service B", quantity: 1, unitPrice: 3.333, lineTotal: 3.333 },
      ],
      0.5,
    );

    expect(converted[0]).toMatchObject({
      quantity: 2,
      unitPrice: 5,
      lineTotal: 10,
    });
    expect(converted[1].unitPrice).toBe(1.67);
    expect(converted[1].lineTotal).toBe(1.67);
  });

  it("resolves USD rate as 1 and missing rates as null", () => {
    expect(
      resolveRateToUsd({
        currencyId: "1",
        currencyIso: "USD",
        fxRates: [],
      }),
    ).toBe(1);

    expect(
      resolveRateToUsd({
        currencyId: "2",
        currencyIso: "IQD",
        fxRates: [{ currencyId: "2", rateToUsd: 0.00076 }],
      }),
    ).toBe(0.00076);

    expect(
      resolveRateToUsd({
        currencyId: "3",
        currencyIso: "IQD",
        fxRates: [{ currencyId: "2", rateToUsd: 0.00076 }],
      }),
    ).toBeNull();
  });
});
