/**
 * GET — Dizlee portal.
 * Download a generated consolidation workbook for a run.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getConsolidationDetail } from "@/lib/dizlee/consolidation";
import {
  buildConsolidationWorkbook,
  consolidationExportFilename,
} from "@/lib/dizlee/consolidation/export-excel";
import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const consolidationId = Number(id);

    if (!Number.isInteger(consolidationId)) {
      return jsonError(appErrorFromUnknown("Invalid consolidation id.", 400));
    }

    const detail = await getConsolidationDetail(consolidationId);
    if (!detail) {
      return jsonError(appErrorFromUnknown("Consolidation not found.", 404));
    }

    const buffer = await buildConsolidationWorkbook(detail);
    const filename = consolidationExportFilename(
      detail.opcoId,
      detail.period.month,
      detail.period.year,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: buildFileResponseHeaders({
        filename,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        forceAttachment: true,
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
