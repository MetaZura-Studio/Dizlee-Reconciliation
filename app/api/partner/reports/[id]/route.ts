import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import { getReportDetailForPartner } from "@/lib/partner/queries/reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  const detail = await getReportDetailForPartner(
    BigInt(session.partnerId),
    BigInt(id),
  );

  if (!detail) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ detail });
}
