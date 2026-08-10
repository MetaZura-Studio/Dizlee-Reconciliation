/**
 * GET — Dizlee portal.
 * Return detail and line-level results for a reconciliation run.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getReconciliationDetail } from "@/lib/dizlee/reconciliation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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
    const data = await getReconciliationDetail(reconciliationId);
    if (!data) {
      return jsonError(appErrorFromUnknown("Reconciliation not found", 404));
    }
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
