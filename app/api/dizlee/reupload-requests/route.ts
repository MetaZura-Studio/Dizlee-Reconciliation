/**
 * GET — Dizlee portal.
 * List pending and historical file re-upload approval requests.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getReportFilterOptions,
  listReuploadRequests,
  parseReuploadListFilters,
} from "@/lib/dizlee/reupload-requests";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReuploadListFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      listReuploadRequests(filters),
      getReportFilterOptions(),
    ]);

    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    return jsonError(error);
  }
}
