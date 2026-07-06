import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getReconciliationDetail } from "@/lib/dizlee/reconciliation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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
    const data = await getReconciliationDetail(reconciliationId);
    if (!data) {
      return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load reconciliation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
