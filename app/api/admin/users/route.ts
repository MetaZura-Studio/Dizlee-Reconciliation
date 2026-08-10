/**
 * GET, POST — Admin portal.
 * List platform users or invite/create a new user.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { createUser, listUsers, parseUserListFilters } from "@/lib/admin/users";
import type { CreateUserInput } from "@/lib/admin/validation/users";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseUserListFilters(searchParams);
    const data = await listUsers(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as CreateUserInput;
    const data = await createUser(body, user.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
