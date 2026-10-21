/**
 * GET — Partner portal.
 * List Partner Revenue Share reports received for this Partner + period.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { getPartnerSession } from "@/lib/partner/auth";
import {
  listPartnerRevenueShareReports,
  parsePartnerRsListFilters,
} from "@/lib/dizlee/partner-revenue-share";

export async function GET(request: NextRequest) {
  const user = await getPartnerSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const filters = parsePartnerRsListFilters(request.nextUrl.searchParams);
    const data = await listPartnerRevenueShareReports({
      ...filters,
      partnerId: user.partnerId,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
