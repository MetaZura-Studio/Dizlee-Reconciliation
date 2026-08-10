/**
 * GET — Dizlee portal.
 * Report whether prerequisites are met to run consolidation for a period.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getConsolidationReadiness,
  parseGenerateFilters,
} from "@/lib/dizlee/consolidation";
import { getReportFilterOptions } from "@/lib/dizlee/reports";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
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
    return jsonError(error);
  }
}
