import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import { parseDashboardPeriod } from "@/lib/partner/period";
import { getPartnerDashboard } from "@/lib/partner/queries/dashboard";

export async function GET(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { year, month } = parseDashboardPeriod(
    searchParams.get("year") ?? undefined,
    searchParams.get("month") ?? undefined,
  );

  const data = await getPartnerDashboard(
    BigInt(session.partnerId),
    year,
    month,
  );

  return NextResponse.json(data);
}
