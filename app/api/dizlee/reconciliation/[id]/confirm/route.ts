/**
 * PATCH — Dizlee portal.
 * Confirm and finalize a completed reconciliation run.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { confirmReconciliation } from "@/lib/dizlee/reconciliation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const reconciliationId = Number(id);

  if (!Number.isInteger(reconciliationId) || reconciliationId < 1) {
    return jsonError(appErrorFromUnknown("Invalid reconciliation id", 400));
  }

  try {
    await confirmReconciliation(reconciliationId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
