/**
 * GET — Dizlee portal.
 * List Partner Revenue Share reports sent for a period.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listPartnerRevenueShareReports,
  parsePartnerRsListFilters,
} from "@/lib/dizlee/partner-revenue-share";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const filters = parsePartnerRsListFilters(request.nextUrl.searchParams);
    const data = await listPartnerRevenueShareReports(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
