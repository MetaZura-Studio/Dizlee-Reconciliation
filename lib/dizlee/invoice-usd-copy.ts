/**
 * Convert local-currency invoice lines to USD for dual-copy PDF preview.
 * Persistence of includeUsdCopy / usdFxRate on invoices comes later.
 */

export type ConvertibleInvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function convertInvoiceLinesToUsd<T extends ConvertibleInvoiceLine>(
  lines: T[],
  rateToUsd: number,
): Array<T & { unitPrice: number; lineTotal: number }> {
  return lines.map((line) => {
    const unitPrice = roundMoney(line.unitPrice * rateToUsd);
    const quantity = line.quantity;
    const lineTotal = roundMoney(
      typeof line.lineTotal === "number" && Number.isFinite(line.lineTotal)
        ? line.lineTotal * rateToUsd
        : quantity * unitPrice,
    );
    return {
      ...line,
      unitPrice,
      lineTotal,
    };
  });
}

export function resolveRateToUsd(params: {
  currencyId: string;
  currencyIso: string;
  fxRates: Array<{ currencyId: string; rateToUsd: number }>;
}): number | null {
  if (params.currencyIso === "USD") {
    return 1;
  }
  const match = params.fxRates.find((rate) => rate.currencyId === params.currencyId);
  if (!match || !Number.isFinite(match.rateToUsd) || match.rateToUsd <= 0) {
    return null;
  }
  return match.rateToUsd;
}
