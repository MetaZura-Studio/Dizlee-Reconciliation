import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  CurrencyActionError,
  deleteCurrency,
  updateCurrency,
} from "@/lib/admin/currencies";
import type { UpdateCurrencyInput } from "@/lib/admin/validation/currencies";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateCurrencyInput;
    const currency = await updateCurrency(id, body, BigInt(user.id));
    return NextResponse.json({ data: currency });
  } catch (error) {
    if (error instanceof CurrencyActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update currency";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await deleteCurrency(id, BigInt(user.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof CurrencyActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete currency";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
