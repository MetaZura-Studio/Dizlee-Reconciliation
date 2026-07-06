import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getReportFilterOptions,
  listReportMonitoringLanes,
  parseReportMonitoringFilters,
} from "@/lib/dizlee/reports-monitoring";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReportMonitoringFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      listReportMonitoringLanes(filters),
      getReportFilterOptions(),
    ]);

    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load reports monitoring";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
