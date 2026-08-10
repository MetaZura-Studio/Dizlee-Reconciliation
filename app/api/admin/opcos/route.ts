/**
 * GET, POST — Admin portal.
 * List OpCos or create a new OpCo organization.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { createOpco, listOpcos } from "@/lib/admin/opcos";
import type { CreateOpcoInput } from "@/lib/admin/validation/opcos";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const opcos = await listOpcos();
    return NextResponse.json({ data: { opcos } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as CreateOpcoInput;
    const opco = await createOpco(body, BigInt(user.id));
    return NextResponse.json({ data: opco }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
