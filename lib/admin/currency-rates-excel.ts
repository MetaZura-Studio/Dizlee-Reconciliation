/**
 * Admin currency rate Excel import/export — parses ISO + rate columns from uploaded workbooks.
 * Validates against platform base currency; returns row-level issues without throwing on bad rows.
 */
import ExcelJS from "exceljs";

import {
  BASE_CURRENCY_ISO_CODE,
  BASE_CURRENCY_RATE,
} from "@/lib/platform/currency-rates";

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
 * Parse currency rate Excel. Expected headers: ISO | RateToUSD (aliases accepted).
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
      header === "ratetousd" ||
      header === "rate" ||
      header === "usdrate" ||
      header === "rateusd" ||
      // Legacy KWD-based templates still accepted
      header === "ratetokwd" ||
      header === "kwdrate" ||
      header === "ratekwd"
    ) {
      rateCol = colNumber;
    }
  });

  if (!isoCol || !rateCol) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message: "Missing required headers. Expected ISO and RateToUSD columns.",
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

    const rate = parseRate(row.getCell(rateCol).value);
    if (rate === null) {
      issues.push({
        rowNumber,
        message: `Missing or invalid rate for ${isoRaw}`,
      });
      return;
    }

    if (rate <= 0) {
      issues.push({
        rowNumber,
        message: `Rate for ${isoRaw} must be positive`,
      });
      return;
    }

    if (isoRaw === BASE_CURRENCY_ISO_CODE && rate !== BASE_CURRENCY_RATE) {
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
    rows.push({ isoCode: isoRaw, rateToUsd: rate, rowNumber });
  });

  return { rows, issues };
}

export async function buildCurrencyRatesTemplateBuffer(
  currencies: Array<{ isoCode: string; rateToUsd?: number | null }>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Rates");
  sheet.columns = [
    { header: "ISO", key: "iso", width: 12 },
    { header: "RateToUSD", key: "rate", width: 16 },
  ];

  for (const currency of currencies) {
    sheet.addRow({
      iso: currency.isoCode,
      rate:
        currency.isoCode === BASE_CURRENCY_ISO_CODE
          ? BASE_CURRENCY_RATE
          : (currency.rateToUsd ?? ""),
    });
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
