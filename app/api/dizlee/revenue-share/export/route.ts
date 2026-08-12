/**
 * GET — Dizlee portal.
 * Download the Revenue Share Report workbook when all uploads are present.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  buildRevenueShareReport,
  parseRevenueShareFilters,
} from "@/lib/dizlee/revenue-share";
import {
  buildRevenueShareWorkbook,
  revenueShareExportFilename,
} from "@/lib/dizlee/revenue-share/export-excel";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const filters = parseRevenueShareFilters(new URL(request.url).searchParams);
    if (!filters.opcoId) {
      return NextResponse.json({ error: "OpCo is required." }, { status: 400 });
    }

    const report = await buildRevenueShareReport({
      month: filters.month,
      year: filters.year,
      opcoId: filters.opcoId,
    });
    const buffer = await buildRevenueShareWorkbook(report);
    const filename = revenueShareExportFilename(
      report.opcoName,
      report.period.month,
      report.period.year,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
