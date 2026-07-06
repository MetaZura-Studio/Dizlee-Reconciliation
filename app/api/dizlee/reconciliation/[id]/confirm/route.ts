import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  ReconciliationError,
  confirmReconciliation,
} from "@/lib/dizlee/reconciliation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const reconciliationId = Number(id);

  if (!Number.isInteger(reconciliationId) || reconciliationId < 1) {
    return NextResponse.json({ error: "Invalid reconciliation id" }, { status: 400 });
  }

  try {
    await confirmReconciliation(reconciliationId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ReconciliationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Failed to confirm reconciliation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
