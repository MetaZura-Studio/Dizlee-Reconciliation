/**
 * POST — Dizlee portal.
 * Execute reconciliation for selected period and lane criteria.
 */

import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  ReconciliationError,
  runReconciliation,
} from "@/lib/dizlee/reconciliation";

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    if (error instanceof ReconciliationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Failed to run reconciliation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
