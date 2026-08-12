/**
 * GET, POST — Admin portal.
 * List or create global Service–Partner mappings.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  createServicePartnerMap,
  listServicePartnerMaps,
} from "@/lib/admin/service-partner-maps";
import type { CreateServicePartnerMapInput } from "@/lib/admin/validation/service-partner-maps";
import { jsonError, unauthorized } from "@/lib/errors/respond";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const maps = await listServicePartnerMaps();
    return NextResponse.json({ data: { maps } });
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
    const body = (await request.json()) as CreateServicePartnerMapInput;
    const map = await createServicePartnerMap(body, BigInt(user.id));
    return NextResponse.json({ data: map }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
