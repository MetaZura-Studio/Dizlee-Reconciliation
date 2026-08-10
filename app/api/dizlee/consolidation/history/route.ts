/**
 * GET — Dizlee portal.
 * List past consolidation runs with status and metadata.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listConsolidationHistory,
  parseHistoryFilters,
} from "@/lib/dizlee/consolidation";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseHistoryFilters(searchParams);
    const data = await listConsolidationHistory(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
