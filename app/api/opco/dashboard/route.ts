import { NextResponse } from "next/server";

import { getOpcoSession } from "@/lib/opco/auth";
import { parseDashboardPeriod } from "@/lib/opco/period";
import { getOpcoDashboard } from "@/lib/opco/queries/dashboard";

export async function GET(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { year, month } = parseDashboardPeriod(
    searchParams.get("year") ?? undefined,
    searchParams.get("month") ?? undefined,
  );

  const data = await getOpcoDashboard(BigInt(session.opcoId), year, month);

  return NextResponse.json(data);
}
