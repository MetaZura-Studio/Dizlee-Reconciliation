/**
 * GET — Dizlee portal.
 * List submitted reports with filters and pagination.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getReportFilterOptions,
  listReports,
  parseReportListFilters,
} from "@/lib/dizlee/reports";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReportListFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      listReports(filters),
      getReportFilterOptions(),
    ]);

    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    return jsonError(error);
  }
}
