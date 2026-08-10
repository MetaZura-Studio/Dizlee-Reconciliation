/**
 * PATCH, DELETE — Admin portal.
 * Update or deactivate a platform user account.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { deleteUser, updateUser } from "@/lib/admin/users";
import type { UpdateUserInput } from "@/lib/admin/validation/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateUserInput;
    const data = await updateUser(id, body, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    await deleteUser(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
