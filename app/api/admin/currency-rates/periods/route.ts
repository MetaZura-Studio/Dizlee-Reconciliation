import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { listRatePeriods } from "@/lib/admin/currency-rates";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const periods = await listRatePeriods();
    return NextResponse.json({ data: { periods } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load rate periods";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
