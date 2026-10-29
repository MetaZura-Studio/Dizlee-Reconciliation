/**
 * OpCo FX conversion factor: most currencies multiply LC × rate = USD;
 * IQD / SDG / SSP divide LC ÷ rate = USD (client Closing Rate sheet).
 */

const DIVIDE_FX_ISO_CODES = new Set(["IQD", "SDG", "SSP"]);

export type CurrencyFxFactor = "multiply" | "divide";

/** True when Admin conversion rate is a divisor (USD = LC ÷ rate). */
export function currencyUsesDivideFx(isoCode: string): boolean {
  return DIVIDE_FX_ISO_CODES.has(isoCode.trim().toUpperCase());
}

export function currencyFxFactor(isoCode: string): CurrencyFxFactor {
  return currencyUsesDivideFx(isoCode) ? "divide" : "multiply";
}

export function currencyFxFactorLabel(isoCode: string): "Multiply" | "Divide" {
  return currencyUsesDivideFx(isoCode) ? "Divide" : "Multiply";
}
