/**
 * GET — OpCo portal.
 * Return detail for a single OpCo-visible report.
 */

import { NextResponse } from "next/server";

import { getOpcoSession } from "@/lib/opco/auth";
import { getReportDetailForOpco } from "@/lib/opco/queries/reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  const detail = await getReportDetailForOpco(BigInt(session.opcoId), BigInt(id));

  if (!detail) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ detail });
}
