/**
 * GET — Dizlee portal.
 * OpCo–Partner period gross revenue from the latest OpCo report.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getPeriodRevenue,
  getPeriodRevenueFilterOptions,
  parsePeriodRevenueFilters,
} from "@/lib/dizlee/period-revenue";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const filters = parsePeriodRevenueFilters(request.nextUrl.searchParams);
    const optionsOnly = request.nextUrl.searchParams.get("options") === "1";

    if (optionsOnly) {
      const filterOptions = await getPeriodRevenueFilterOptions();
      return NextResponse.json({ filterOptions });
    }

    const [data, filterOptions] = await Promise.all([
      getPeriodRevenue(filters),
      getPeriodRevenueFilterOptions(),
    ]);
    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    return jsonError(error);
  }
}
