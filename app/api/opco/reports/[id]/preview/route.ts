import { NextResponse } from "next/server";

import { getOpcoSession } from "@/lib/opco/auth";
import { OPCO_REPORT_VERSION } from "@/lib/platform/reports/sides";
import { buildStoredFilePreviewResponse } from "@/lib/platform/reports/preview-stored-file";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  try {
    const report = await prisma.report.findFirst({
      where: {
        id: BigInt(id),
        opcoId: BigInt(session.opcoId),
        version: OPCO_REPORT_VERSION,
        isDeleted: false,
      },
      include: { file: true },
    });

    if (!report?.file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return buildStoredFilePreviewResponse(report.file);
  } catch (error) {
    console.error("OpCo report preview failed", error);
    return NextResponse.json({ error: "Failed to load report file" }, { status: 500 });
  }
}
