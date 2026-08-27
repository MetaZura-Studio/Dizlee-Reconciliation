/**
 * GET — OpCo portal.
 * Preview the raw monthly Excel for a submission.
 */

import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getOpcoSession } from "@/lib/opco/auth";
import { buildStoredFilePreviewResponse } from "@/lib/platform/reports/preview-stored-file";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getOpcoSession();
  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid submission id", 400));
  }

  try {
    const submission = await prisma.opcoReportSubmission.findFirst({
      where: {
        id: BigInt(id),
        opcoId: BigInt(session.opcoId),
        isDeleted: false,
      },
      include: { file: true },
    });

    if (!submission?.file) {
      return jsonError(appErrorFromUnknown("File not found", 404));
    }

    return buildStoredFilePreviewResponse(submission.file);
  } catch (error) {
    console.error("OpCo submission preview failed", error);
    return jsonError(appErrorFromUnknown("Failed to load report file", 500));
  }
}
