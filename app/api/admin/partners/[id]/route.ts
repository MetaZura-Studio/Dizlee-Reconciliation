/**
 * PATCH, DELETE — Admin portal.
 * Update or soft-delete a partner organization record.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  deletePartner,
  PartnerActionError,
  updatePartner,
} from "@/lib/admin/partners";
import type { UpdatePartnerInput } from "@/lib/admin/validation/partners";

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
    const body = (await request.json()) as UpdatePartnerInput;
    const partner = await updatePartner(id, body, BigInt(user.id));
    return NextResponse.json({ data: partner });
  } catch (error) {
    if (error instanceof PartnerActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update Partner";
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
    await deletePartner(id, BigInt(user.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof PartnerActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete Partner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
