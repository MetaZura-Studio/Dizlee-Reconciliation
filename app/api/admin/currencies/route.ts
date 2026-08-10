/**
 * GET, POST — Admin portal.
 * List currencies or create a new currency record.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { createCurrency, listCurrencies } from "@/lib/admin/currencies";
import type { CreateCurrencyInput } from "@/lib/admin/validation/currencies";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const currencies = await listCurrencies();
    return NextResponse.json({ data: { currencies } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as CreateCurrencyInput;
    const currency = await createCurrency(body, BigInt(user.id));
    return NextResponse.json({ data: currency }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
