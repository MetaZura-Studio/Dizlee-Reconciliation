/**
 * GET — Dizlee portal.
 * Whether OpCo + all linked Partner reports exist for a Revenue Share Report.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getReportFilterOptions } from "@/lib/dizlee/reports";
import {
  getRevenueShareReadiness,
  parseRevenueShareFilters,
} from "@/lib/dizlee/revenue-share";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const filters = parseRevenueShareFilters(new URL(request.url).searchParams);

    if (!filters.opcoId) {
      return NextResponse.json({
        data: null,
        filterOptions: await getReportFilterOptions(),
      });
    }

    const data = await getRevenueShareReadiness({
      month: filters.month,
      year: filters.year,
      opcoId: filters.opcoId,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
