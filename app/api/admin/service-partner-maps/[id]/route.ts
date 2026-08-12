/**
 * PATCH, DELETE — Admin portal.
 * Update or soft-delete a Service–Partner mapping.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  deleteServicePartnerMap,
  updateServicePartnerMap,
} from "@/lib/admin/service-partner-maps";
import type { UpdateServicePartnerMapInput } from "@/lib/admin/validation/service-partner-maps";
import { jsonError, unauthorized } from "@/lib/errors/respond";

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
    const body = (await request.json()) as UpdateServicePartnerMapInput;
    const map = await updateServicePartnerMap(id, body, BigInt(user.id));
    return NextResponse.json({ data: map });
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
    await deleteServicePartnerMap(id, BigInt(user.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return jsonError(error);
  }
}
