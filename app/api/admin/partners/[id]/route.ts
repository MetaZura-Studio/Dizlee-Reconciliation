/**
 * PATCH, DELETE — Admin portal.
 * Update or soft-delete a partner organization record.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { deletePartner, updatePartner } from "@/lib/admin/partners";
import type { UpdatePartnerInput } from "@/lib/admin/validation/partners";

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
    const body = (await request.json()) as UpdatePartnerInput;
    const partner = await updatePartner(id, body, BigInt(user.id));
    return NextResponse.json({ data: partner });
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
    await deletePartner(id, BigInt(user.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return jsonError(error);
  }
}
