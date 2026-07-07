import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import {
  getPartnerReportFilterOptions,
  parsePartnerReportListFilters,
  searchReportsForPartner,
} from "@/lib/partner/queries/reports";

export async function GET(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerId = BigInt(session.partnerId);
  const filters = parsePartnerReportListFilters(new URL(request.url).searchParams);

  const [result, filterOptions] = await Promise.all([
    searchReportsForPartner(partnerId, filters),
    getPartnerReportFilterOptions(partnerId),
  ]);

  return NextResponse.json({ result, filterOptions });
}
