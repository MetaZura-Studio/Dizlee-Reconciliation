import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ActivityError,
  listActivityTimeline,
  parseActivityFilters,
} from "@/lib/dizlee/activity";
import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getReportFilterOptions } from "@/lib/dizlee/reports";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseActivityFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      listActivityTimeline(filters),
      getReportFilterOptions(),
    ]);
    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    if (error instanceof ActivityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load activity timeline";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
