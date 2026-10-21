/**
 * GET / PATCH — Admin portal.
 * List and update per-service regulatory fees for an OpCo.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getOpcoRegulatoryFeesPage,
  updateOpcoRegulatoryFees,
} from "@/lib/admin/opco-regulatory-fees";
import { jsonError, unauthorized } from "@/lib/errors/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const page = await getOpcoRegulatoryFeesPage(id);
    return NextResponse.json({ data: page });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as unknown;
    const page = await updateOpcoRegulatoryFees(
      id,
      body as Parameters<typeof updateOpcoRegulatoryFees>[1],
      BigInt(user.id),
    );
    return NextResponse.json({ data: page });
  } catch (error) {
    return jsonError(error);
  }
}
