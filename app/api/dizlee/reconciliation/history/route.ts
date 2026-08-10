/**
 * GET — Dizlee portal.
 * List past reconciliation runs for a period or lane.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listReconciliationHistory,
  parseHistoryFilters,
} from "@/lib/dizlee/reconciliation";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseHistoryFilters(searchParams);
    const data = await listReconciliationHistory(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
