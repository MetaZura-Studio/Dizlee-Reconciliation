/**
 * GET — Partner portal.
 * Return detail for a single partner-visible report.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getPartnerSession } from "@/lib/partner/auth";
import { getReportDetailForPartner } from "@/lib/partner/queries/reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid report id", 400));
  }

  const detail = await getReportDetailForPartner(
    BigInt(session.partnerId),
    BigInt(id),
  );

  if (!detail) {
    return jsonError(appErrorFromUnknown("Report not found", 404));
  }

  return NextResponse.json({ detail });
}
