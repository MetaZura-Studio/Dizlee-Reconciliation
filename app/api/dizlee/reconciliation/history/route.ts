import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listReconciliationHistory,
  parseHistoryFilters,
} from "@/lib/dizlee/reconciliation";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseHistoryFilters(searchParams);
    const data = await listReconciliationHistory(filters);
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load reconciliation history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
