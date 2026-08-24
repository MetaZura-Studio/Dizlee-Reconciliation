/**
 * POST — Dizlee portal.
 * Execute reconciliation for selected period and lane criteria.
 */

import { NextResponse } from "next/server";
import {
  jsonError,
  unauthorized,
  validationFailed,
} from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { runReconciliation } from "@/lib/dizlee/reconciliation";
import { runReconciliationBodySchema } from "@/lib/dizlee/validation/api-bodies";

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return validationFailed();
    }

    const parsed = runReconciliationBodySchema.safeParse(raw);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten().fieldErrors);
    }

    const result = await runReconciliation({
      month: parsed.data.month,
      year: parsed.data.year,
      opcoId: parsed.data.opcoId,
      partnerId: parsed.data.partnerId,
      runByUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
