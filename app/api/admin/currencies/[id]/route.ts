/**
 * PATCH, DELETE — Admin portal.
 * Update or soft-delete a currency lookup record.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { deleteCurrency, updateCurrency } from "@/lib/admin/currencies";
import type { UpdateCurrencyInput } from "@/lib/admin/validation/currencies";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateCurrencyInput;
    const currency = await updateCurrency(id, body, BigInt(user.id));
    return NextResponse.json({ data: currency });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    await deleteCurrency(id, BigInt(user.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return jsonError(error);
  }
}
