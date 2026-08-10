/**
 * GET — OpCo portal.
 * Return summary metrics for the signed-in OpCo portal dashboard.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import { parseDashboardPeriod } from "@/lib/opco/period";
import { getOpcoDashboard } from "@/lib/opco/queries/dashboard";

export async function GET(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const { year, month } = parseDashboardPeriod(
    searchParams.get("year") ?? undefined,
    searchParams.get("month") ?? undefined,
  );

  const data = await getOpcoDashboard(BigInt(session.opcoId), year, month);

  return NextResponse.json(data);
}
