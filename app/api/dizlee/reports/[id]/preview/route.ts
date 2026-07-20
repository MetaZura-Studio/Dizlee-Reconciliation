import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { buildStoredFilePreviewResponse } from "@/lib/platform/reports/preview-stored-file";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  try {
    const report = await prisma.report.findFirst({
      where: { id: BigInt(id), isDeleted: false },
      include: { file: true },
    });

    if (!report?.file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return buildStoredFilePreviewResponse(report.file);
  } catch (error) {
    console.error("Dizlee report preview failed", error);
    return NextResponse.json({ error: "Failed to load report file" }, { status: 500 });
  }
}
