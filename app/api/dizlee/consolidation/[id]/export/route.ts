import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getConsolidationDetail } from "@/lib/dizlee/consolidation";
import {
  buildConsolidationWorkbook,
  consolidationExportFilename,
} from "@/lib/dizlee/consolidation/export-excel";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const consolidationId = Number(id);

    if (!Number.isInteger(consolidationId)) {
      return NextResponse.json({ error: "Invalid consolidation id." }, { status: 400 });
    }

    const detail = await getConsolidationDetail(consolidationId);
    if (!detail) {
      return NextResponse.json({ error: "Consolidation not found." }, { status: 404 });
    }

    const buffer = await buildConsolidationWorkbook(detail);
    const filename = consolidationExportFilename(
      detail.opcoId,
      detail.period.month,
      detail.period.year,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export consolidation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
