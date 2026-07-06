import { NextResponse } from "next/server";

import { getOpcoSession } from "@/lib/opco/auth";
import { listReportsForOpco } from "@/lib/opco/queries/reports";

export async function GET() {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await listReportsForOpco(BigInt(session.opcoId));

  return NextResponse.json({ reports });
}
