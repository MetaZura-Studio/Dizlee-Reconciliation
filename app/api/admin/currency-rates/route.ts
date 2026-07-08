import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  CurrencyRatesError,
  getRatesForPeriod,
  saveRatesForPeriod,
} from "@/lib/admin/currency-rates";
import type { SaveCurrencyRatesInput } from "@/lib/admin/validation/currency-rates";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!Number.isInteger(month) || !Number.isInteger(year)) {
      return NextResponse.json(
        { error: "month and year are required" },
        { status: 400 },
      );
    }

    const data = await getRatesForPeriod(month, year);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof CurrencyRatesError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load currency rates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SaveCurrencyRatesInput;
    const data = await saveRatesForPeriod(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof CurrencyRatesError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save currency rates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
