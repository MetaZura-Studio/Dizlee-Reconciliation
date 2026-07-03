import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
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

  try {
    const report = await prisma.report.findFirst({
      where: { id: BigInt(id) },
      include: { file: true },
    });

    if (!report?.file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "File preview is not configured for local development (missing BLOB_READ_WRITE_TOKEN).",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      data: {
        filename: report.file.filename,
        storageKey: report.file.storageKey,
        mimeType: report.file.mimeType,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load file preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
