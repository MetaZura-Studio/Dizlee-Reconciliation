/**
 * GET — Dizlee portal.
 * Return report submission metrics for monitoring dashboards.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getReportFilterOptions,
  listReportMonitoringLanes,
  parseReportMonitoringFilters,
} from "@/lib/dizlee/reports-monitoring";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReportMonitoringFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      listReportMonitoringLanes(filters),
      getReportFilterOptions(),
    ]);

    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    return jsonError(error);
  }
}
