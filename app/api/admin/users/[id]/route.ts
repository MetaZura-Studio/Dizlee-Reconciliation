/**
 * PATCH, DELETE — Admin portal.
 * Update or deactivate a platform user account.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  deleteUser,
  updateUser,
  UserActionError,
} from "@/lib/admin/users";
import type { UpdateUserInput } from "@/lib/admin/validation/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateUserInput;
    const data = await updateUser(id, body, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof UserActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await deleteUser(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UserActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
