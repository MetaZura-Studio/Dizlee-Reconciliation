/**
 * GET, POST — Admin portal.
 * List partners or create a new partner organization.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { createPartner, listPartners } from "@/lib/admin/partners";
import type { CreatePartnerInput } from "@/lib/admin/validation/partners";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const partners = await listPartners();
    return NextResponse.json({ data: { partners } });
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
    const body = (await request.json()) as CreatePartnerInput;
    const partner = await createPartner(body, BigInt(user.id));
    return NextResponse.json({ data: partner }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
