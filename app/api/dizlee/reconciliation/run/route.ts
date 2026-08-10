/**
 * POST — Dizlee portal.
 * Execute reconciliation for selected period and lane criteria.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { runReconciliation } from "@/lib/dizlee/reconciliation";

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as {
      month?: number;
      year?: number;
      opcoId?: string;
      partnerId?: string;
    };

    if (!body.month || !body.year || !body.opcoId || !body.partnerId) {
      return NextResponse.json(
        { error: "Period, OpCo, and Partner are required." },
        { status: 400 },
      );
    }

    const result = await runReconciliation({
      month: body.month,
      year: body.year,
      opcoId: body.opcoId,
      partnerId: body.partnerId,
      runByUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
