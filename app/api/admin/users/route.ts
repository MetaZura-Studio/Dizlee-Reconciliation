/**
 * GET, POST — Admin portal.
 * List platform users or invite/create a new user.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  createUser,
  listUsers,
  parseUserListFilters,
  UserActionError,
} from "@/lib/admin/users";
import type { CreateUserInput } from "@/lib/admin/validation/users";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseUserListFilters(searchParams);
    const data = await listUsers(filters);
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateUserInput;
    const data = await createUser(body, user.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof UserActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
