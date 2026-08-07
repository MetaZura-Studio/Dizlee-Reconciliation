/**
 * GET — Dizlee portal.
 * List past consolidation runs with status and metadata.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listConsolidationHistory,
  parseHistoryFilters,
} from "@/lib/dizlee/consolidation";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseHistoryFilters(searchParams);
    const data = await listConsolidationHistory(filters);
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load consolidation history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
