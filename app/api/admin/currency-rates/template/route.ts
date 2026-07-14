import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  CurrencyRatesError,
  currentCalendarPeriod,
  getRatesForPeriod,
} from "@/lib/admin/currency-rates";
import { buildCurrencyRatesTemplateBuffer } from "@/lib/admin/currency-rates-excel";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { month, year } = currentCalendarPeriod();
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
        "Content-Disposition": `attachment; filename="currency-rates-${year}-${String(month).padStart(2, "0")}-template.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof CurrencyRatesError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to build template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
