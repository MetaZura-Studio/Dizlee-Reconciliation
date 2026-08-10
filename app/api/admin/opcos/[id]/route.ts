/**
 * PATCH, DELETE — Admin portal.
 * Update or soft-delete an OpCo organization record.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { deleteOpco, updateOpco } from "@/lib/admin/opcos";
import type { UpdateOpcoInput } from "@/lib/admin/validation/opcos";

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
    const body = (await request.json()) as UpdateOpcoInput;
    const opco = await updateOpco(id, body, BigInt(user.id));
    return NextResponse.json({ data: opco });
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
    await deleteOpco(id, BigInt(user.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return jsonError(error);
  }
}
