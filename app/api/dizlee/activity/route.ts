/**
 * GET — Dizlee portal.
 * Return recent platform activity events for the Dizlee operations feed.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import {
  listActivityTimeline,
  parseActivityFilters,
} from "@/lib/dizlee/activity";
import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getReportFilterOptions } from "@/lib/dizlee/reports";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
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
    return jsonError(error);
  }
}
