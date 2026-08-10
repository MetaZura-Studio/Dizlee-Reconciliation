/**
 * GET — Dizlee portal.
 * Return preview content for a submitted partner or OpCo report file.
 */

import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { buildStoredFilePreviewResponse } from "@/lib/platform/reports/preview-stored-file";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid report id", 400));
  }

  try {
    const report = await prisma.report.findFirst({
      where: { id: BigInt(id), isDeleted: false },
      include: { file: true },
    });

    if (!report?.file) {
      return jsonError(appErrorFromUnknown("File not found", 404));
    }

    return buildStoredFilePreviewResponse(report.file);
  } catch (error) {
    console.error("Dizlee report preview failed", error);
    return jsonError(appErrorFromUnknown("Failed to load report file", 500));
  }
}
