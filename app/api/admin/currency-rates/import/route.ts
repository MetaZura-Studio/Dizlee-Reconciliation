/**
 * POST — Admin portal.
 * Import FX rates from an uploaded spreadsheet for a billing period.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  CURRENT_MONTH_RATES_ONLY_MESSAGE,
  currentCalendarPeriod,
  getRatesForPeriod,
} from "@/lib/admin/currency-rates";
import {
  mergeParsedRatesIntoDraft,
  parseCurrencyRatesExcel,
} from "@/lib/admin/currency-rates-excel";
import { listCurrencies } from "@/lib/admin/currencies";
import {
  assertExcelBufferMagic,
  validateExcelUploadFile,
} from "@/lib/platform/excel-upload";
import { isSameCalendarPeriod } from "@/lib/platform/currency-rates";

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Upload an Excel file in the file field" },
        { status: 400 },
      );
    }

    const fileError = validateExcelUploadFile(file, { allowLegacyXls: true });
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const magicError = assertExcelBufferMagic(buffer, file.name);
    if (magicError) {
      return NextResponse.json({ error: magicError }, { status: 400 });
    }

    const parsed = await parseCurrencyRatesExcel(buffer);
    if (parsed.rows.length === 0 && parsed.issues.length > 0) {
      return NextResponse.json(
        {
          error: parsed.issues[0]?.message ?? "Could not parse Excel file",
          issues: parsed.issues,
        },
        { status: 400 },
      );
    }

    const current = currentCalendarPeriod();
    const monthRaw = formData.get("month");
    const yearRaw = formData.get("year");
    const month =
      typeof monthRaw === "string" && monthRaw.trim() !== ""
        ? Number(monthRaw)
        : current.month;
    const year =
      typeof yearRaw === "string" && yearRaw.trim() !== ""
        ? Number(yearRaw)
        : current.year;

    if (
      !Number.isInteger(month) ||
      !Number.isInteger(year) ||
      !isSameCalendarPeriod(month, year, current)
    ) {
      return NextResponse.json(
        { error: CURRENT_MONTH_RATES_ONLY_MESSAGE },
        { status: 400 },
      );
    }

    const [currencies, periodView] = await Promise.all([
      listCurrencies(),
      getRatesForPeriod(month, year),
    ]);

    const merged = mergeParsedRatesIntoDraft({
      currencies,
      existingRates: periodView.rates.map((rate) => ({
        currencyId: rate.currencyId,
        rateToUsd: rate.rateToUsd,
      })),
      parsedRows: parsed.rows,
    });

    const rates = periodView.rates.map((rate) => {
      const draft = merged.rates.find(
        (item) => item.currencyId === rate.currencyId,
      );
      const rateToUsd = rate.isBase ? 1 : (draft?.rateToUsd ?? rate.rateToUsd);
      return {
        ...rate,
        rateToUsd,
        hasRate: rate.isBase || rateToUsd !== null,
      };
    });

    return NextResponse.json({
      data: {
        month: periodView.month,
        year: periodView.year,
        periodLabel: periodView.periodLabel,
        isCurrent: periodView.isCurrent,
        rates,
        setCount: rates.filter((rate) => rate.hasRate).length,
        totalCurrencies: rates.length,
        applied: merged.applied,
        skippedUnknown: merged.skippedUnknown,
        issues: parsed.issues,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
