/**
 * GET — Dizlee portal.
 * List available reconciliation lanes and their readiness.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getTolerancePercent,
  listCompareLanes,
  parseCompareLaneFilters,
} from "@/lib/dizlee/reconciliation";
import { getReportFilterOptions } from "@/lib/dizlee/reports";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseCompareLaneFilters(searchParams);
    const [lanes, filterOptions, tolerancePercent] = await Promise.all([
      listCompareLanes(filters),
      getReportFilterOptions(),
      getTolerancePercent(),
    ]);

    return NextResponse.json({ data: lanes, filterOptions, tolerancePercent });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load reconciliation lanes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
