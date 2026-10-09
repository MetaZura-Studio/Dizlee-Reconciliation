/**
 * Admin currency rate Excel import/export — parses ISO + rate columns from uploaded workbooks.
 * Validates against platform base currency; returns row-level issues without throwing on bad rows.
 */
import ExcelJS from "exceljs";

import {
  formatRateInput,
  localPerUsdFromStoredRateToUsd,
  storedRateToUsdFromLocalPerUsd,
} from "@/lib/admin/currency-rate-input";
import {
  BASE_CURRENCY_ISO_CODE,
  BASE_CURRENCY_RATE,
} from "@/lib/platform/currency-rates";
import { decimalPrecisionForCurrency } from "@/lib/platform/format-money";

type RateColumnKind = "storedRateToUsd" | "localPerUsd";

export type ParsedCurrencyRateRow = {
  isoCode: string;
  rateToUsd: number;
  rowNumber: number;
};

export type CurrencyRatesParseIssue = {
  rowNumber: number;
  message: string;
};

export type CurrencyRatesParseResult = {
  rows: ParsedCurrencyRateRow[];
  issues: CurrencyRatesParseIssue[];
};

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  if (typeof value === "object" && "result" in value) {
    return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

function normalizeHeader(value: ExcelJS.CellValue): string {
  return cellText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseRate(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const text = cellText(value).replace(/,/g, "");
  if (!text) {
    return null;
  }
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parse currency rate Excel.
 * Preferred headers: ISO | UnitsPerUSD (local units per 1 USD).
 * Legacy RateToUSD / Rate / RateToKWD still accepted as stored rateToUsd.
 */
export async function parseCurrencyRatesExcel(
  buffer: ArrayBuffer | Buffer | Uint8Array,
): Promise<CurrencyRatesParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      rows: [],
      issues: [{ rowNumber: 0, message: "Workbook has no sheets" }],
    };
  }

  const headerRow = sheet.getRow(1);
  let isoCol = 0;
  let rateCol = 0;
  let rateKind: RateColumnKind | null = null;

  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(cell.value);
    if (
      header === "iso" ||
      header === "isocode" ||
      header === "currency" ||
      header === "currencycode"
    ) {
      isoCol = colNumber;
    }
    if (
      header === "unitsperusd" ||
      header === "localperusd" ||
      header === "ratefromusd"
    ) {
      rateCol = colNumber;
      rateKind = "localPerUsd";
    }
    if (
      rateKind === null &&
      (header === "ratetousd" ||
        header === "rate" ||
        header === "usdrate" ||
        header === "rateusd" ||
        // Legacy KWD-based templates still accepted (stored rateToUsd)
        header === "ratetokwd" ||
        header === "kwdrate" ||
        header === "ratekwd")
    ) {
      rateCol = colNumber;
      rateKind = "storedRateToUsd";
    }
  });

  if (!isoCol || !rateCol || !rateKind) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message:
            "Missing required headers. Expected ISO and UnitsPerUSD columns.",
        },
      ],
    };
  }

  const rows: ParsedCurrencyRateRow[] = [];
  const issues: CurrencyRatesParseIssue[] = [];
  const seenIso = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const isoRaw = cellText(row.getCell(isoCol).value).toUpperCase();
    if (!isoRaw) {
      return;
    }

    if (!/^[A-Z]{3}$/.test(isoRaw)) {
      issues.push({
        rowNumber,
        message: `Invalid ISO code "${isoRaw}" (expected 3 letters)`,
      });
      return;
    }

    const rawRate = parseRate(row.getCell(rateCol).value);
    if (rawRate === null) {
      issues.push({
        rowNumber,
        message: `Missing or invalid rate for ${isoRaw}`,
      });
      return;
    }

    if (rawRate <= 0) {
      issues.push({
        rowNumber,
        message: `Rate for ${isoRaw} must be positive`,
      });
      return;
    }

    const rateToUsd =
      rateKind === "localPerUsd"
        ? storedRateToUsdFromLocalPerUsd(rawRate)
        : rawRate;

    if (rateToUsd === null) {
      issues.push({
        rowNumber,
        message: `Missing or invalid rate for ${isoRaw}`,
      });
      return;
    }

    if (
      isoRaw === BASE_CURRENCY_ISO_CODE &&
      rateToUsd !== BASE_CURRENCY_RATE
    ) {
      issues.push({
        rowNumber,
        message: `${BASE_CURRENCY_ISO_CODE} rate must be 1 (row skipped; ${BASE_CURRENCY_ISO_CODE} stays locked)`,
      });
      return;
    }

    if (seenIso.has(isoRaw)) {
      issues.push({
        rowNumber,
        message: `Duplicate ISO ${isoRaw} (later row wins)`,
      });
      const existing = rows.findIndex((item) => item.isoCode === isoRaw);
      if (existing >= 0) {
        rows.splice(existing, 1);
      }
    }

    seenIso.add(isoRaw);
    rows.push({ isoCode: isoRaw, rateToUsd, rowNumber });
  });

  return { rows, issues };
}

/**
 * Downloadable import template: ISO + UnitsPerUSD (= how many local units equal 1 USD).
 * Values are rounded to each currency’s money decimal precision (USD/SDG 2, KWD/BHD 3).
 */
export async function buildCurrencyRatesTemplateBuffer(
  currencies: Array<{
    isoCode: string;
    rateToUsd?: number | null;
    decimalPrecision?: number;
  }>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Rates");
  sheet.columns = [
    { header: "ISO", key: "iso", width: 12 },
    { header: "UnitsPerUSD", key: "rate", width: 18 },
  ];

  // Instruction row (ignored by parser — no valid ISO in column A)
  sheet.addRow({
    iso: "",
    rate: "Enter how many units of each currency equal 1 USD (e.g. KWD 0.308, SDG 2.76). USD must stay 1.",
  });
  sheet.getRow(2).font = { italic: true, color: { argb: "FF64748B" } };

  for (const currency of currencies) {
    const precision =
      currency.decimalPrecision ??
      decimalPrecisionForCurrency(currency.isoCode);
    const numFmt =
      precision <= 0 ? "0" : `0.${"0".repeat(precision)}`;

    if (currency.isoCode === BASE_CURRENCY_ISO_CODE) {
      const row = sheet.addRow({
        iso: currency.isoCode,
        rate: BASE_CURRENCY_RATE,
      });
      row.getCell(2).numFmt = numFmt;
      continue;
    }

    const localPerUsd = localPerUsdFromStoredRateToUsd(
      currency.rateToUsd === undefined ? null : currency.rateToUsd,
    );
    const display =
      localPerUsd === null
        ? ""
        : Number(formatRateInput(localPerUsd, precision));
    const row = sheet.addRow({
      iso: currency.isoCode,
      rate: display === "" || Number.isNaN(display) ? "" : display,
    });
    if (display !== "" && !Number.isNaN(display)) {
      row.getCell(2).numFmt = numFmt;
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function mergeParsedRatesIntoDraft(params: {
  currencies: Array<{ id: string; isoCode: string }>;
  existingRates: Array<{ currencyId: string; rateToUsd: number | null }>;
  parsedRows: ParsedCurrencyRateRow[];
}): {
  rates: Array<{ currencyId: string; rateToUsd: number | null }>;
  applied: number;
  skippedUnknown: string[];
} {
  const byIso = new Map(
    params.parsedRows.map((row) => [row.isoCode, row.rateToUsd]),
  );
  const knownIso = new Set(params.currencies.map((c) => c.isoCode));
  const skippedUnknown = params.parsedRows
    .filter((row) => !knownIso.has(row.isoCode))
    .map((row) => row.isoCode);

  const existingById = new Map(
    params.existingRates.map((row) => [row.currencyId, row.rateToUsd]),
  );

  let applied = 0;
  const rates = params.currencies.map((currency) => {
    if (currency.isoCode === BASE_CURRENCY_ISO_CODE) {
      return { currencyId: currency.id, rateToUsd: BASE_CURRENCY_RATE };
    }
    if (byIso.has(currency.isoCode)) {
      applied += 1;
      return {
        currencyId: currency.id,
        rateToUsd: byIso.get(currency.isoCode) ?? null,
      };
    }
    return {
      currencyId: currency.id,
      rateToUsd: existingById.get(currency.id) ?? null,
    };
  });

  return { rates, applied, skippedUnknown: [...new Set(skippedUnknown)] };
}
