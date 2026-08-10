/**
 * GET — Dizlee portal.
 * Return details for a single consolidation run.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getConsolidationDetail } from "@/lib/dizlee/consolidation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const consolidationId = Number(id);

    if (!Number.isInteger(consolidationId)) {
      return jsonError(appErrorFromUnknown("Invalid consolidation id.", 400));
    }

    const data = await getConsolidationDetail(consolidationId);
    if (!data) {
      return jsonError(appErrorFromUnknown("Consolidation not found.", 404));
    }

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
