/**
 * GET — Dizlee portal.
 * Return aggregated reporting datasets for analytics screens.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getReportingOverview,
  getReportFilterOptions,
  parseReportingFilters,
} from "@/lib/dizlee/reporting";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReportingFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      getReportingOverview(filters),
      getReportFilterOptions(),
    ]);
    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    return jsonError(error);
  }
}
