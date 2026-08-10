/**
 * GET, PATCH — Admin portal.
 * Load or update currency exchange rates for a selected period.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getRatesForPeriod,
  saveRatesForPeriod,
} from "@/lib/admin/currency-rates";
import type { SaveCurrencyRatesInput } from "@/lib/admin/validation/currency-rates";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
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
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as SaveCurrencyRatesInput;
    const data = await saveRatesForPeriod(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
