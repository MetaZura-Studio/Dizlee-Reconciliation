/**
 * GET — OpCo portal.
 * List reports for the signed-in OpCo.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import {
  getOpcoReportFilterOptions,
  parseOpcoReportListFilters,
  searchReportsForOpco,
} from "@/lib/opco/queries/reports";

export async function GET(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  const opcoId = BigInt(session.opcoId);
  const filters = parseOpcoReportListFilters(new URL(request.url).searchParams);

  const [result, filterOptions] = await Promise.all([
    searchReportsForOpco(opcoId, filters),
    getOpcoReportFilterOptions(opcoId),
  ]);

  return NextResponse.json({ result, filterOptions });
}
