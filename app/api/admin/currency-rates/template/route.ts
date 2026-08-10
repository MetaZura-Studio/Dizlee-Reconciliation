/**
 * GET — Admin portal.
 * Download the Excel template used for currency rate imports.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  currentCalendarPeriod,
  getRatesForPeriod,
} from "@/lib/admin/currency-rates";
import { buildCurrencyRatesTemplateBuffer } from "@/lib/admin/currency-rates-excel";

export async function GET(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const current = currentCalendarPeriod();
    const monthRaw = searchParams.get("month");
    const yearRaw = searchParams.get("year");
    const month =
      monthRaw && monthRaw.trim() !== "" ? Number(monthRaw) : current.month;
    const year =
      yearRaw && yearRaw.trim() !== "" ? Number(yearRaw) : current.year;

    const view = await getRatesForPeriod(month, year);
    const buffer = await buildCurrencyRatesTemplateBuffer(
      view.rates.map((rate) => ({
        isoCode: rate.isoCode,
        rateToUsd: rate.rateToUsd,
      })),
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="currency-rates-${view.year}-${String(view.month).padStart(2, "0")}-template.xlsx"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
