/**
 * GET, PATCH — Admin portal.
 * Read or update numeric tolerance thresholds used in reconciliation.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getReconciliationTolerance,
  updateReconciliationTolerance,
} from "@/lib/admin/reconciliation-tolerance";
import type { UpdateReconciliationToleranceInput } from "@/lib/admin/validation/reconciliation-tolerance";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const data = await getReconciliationTolerance();
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as UpdateReconciliationToleranceInput;
    const data = await updateReconciliationTolerance(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
