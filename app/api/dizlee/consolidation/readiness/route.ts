/**
 * GET — Dizlee portal.
 * Report whether prerequisites are met to run consolidation for a period.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  ConsolidationError,
  getConsolidationReadiness,
  parseGenerateFilters,
} from "@/lib/dizlee/consolidation";
import { getReportFilterOptions } from "@/lib/dizlee/reports";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseGenerateFilters(searchParams);

    if (!filters.opcoId) {
      const filterOptions = await getReportFilterOptions();
      return NextResponse.json({
        data: null,
        filterOptions,
      });
    }

    const data = await getConsolidationReadiness({
      month: filters.month,
      year: filters.year,
      opcoId: filters.opcoId,
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ConsolidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load consolidation readiness";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
