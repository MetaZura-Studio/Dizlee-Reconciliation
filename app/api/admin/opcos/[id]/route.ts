/**
 * PATCH, DELETE — Admin portal.
 * Update or soft-delete an OpCo organization record.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  deleteOpco,
  OpcoActionError,
  updateOpco,
} from "@/lib/admin/opcos";
import type { UpdateOpcoInput } from "@/lib/admin/validation/opcos";

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
    const body = (await request.json()) as UpdateOpcoInput;
    const opco = await updateOpco(id, body, BigInt(user.id));
    return NextResponse.json({ data: opco });
  } catch (error) {
    if (error instanceof OpcoActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update OpCo";
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
    await deleteOpco(id, BigInt(user.id));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof OpcoActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete OpCo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
