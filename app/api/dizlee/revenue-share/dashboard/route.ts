/**
 * GET — Dizlee portal.
 * Multi-OpCo Revenue Share readiness dashboard for a period.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listRevenueShareDashboard,
  parseRevenueShareFilters,
} from "@/lib/dizlee/revenue-share";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const filters = parseRevenueShareFilters(new URL(request.url).searchParams);
    const data = await listRevenueShareDashboard({
      month: filters.month,
      year: filters.year,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
