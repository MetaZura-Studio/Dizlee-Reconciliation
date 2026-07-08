import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  createCurrency,
  CurrencyActionError,
  listCurrencies,
} from "@/lib/admin/currencies";
import type { CreateCurrencyInput } from "@/lib/admin/validation/currencies";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currencies = await listCurrencies();
    return NextResponse.json({ data: { currencies } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load currencies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateCurrencyInput;
    const currency = await createCurrency(body, BigInt(user.id));
    return NextResponse.json({ data: currency }, { status: 201 });
  } catch (error) {
    if (error instanceof CurrencyActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create currency";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
