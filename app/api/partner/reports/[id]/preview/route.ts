/**
 * GET — Partner portal.
 * Preview a report file submitted by the partner.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getPartnerSession } from "@/lib/partner/auth";
import { buildStoredFilePreviewResponse } from "@/lib/platform/reports/preview-stored-file";
import { PARTNER_REPORT_VERSION } from "@/lib/platform/reports/sides";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid report id", 400));
  }

  try {
    const report = await prisma.report.findFirst({
      where: {
        id: BigInt(id),
        partnerId: BigInt(session.partnerId),
        version: PARTNER_REPORT_VERSION,
        isDeleted: false,
      },
      include: { file: true },
    });

    if (!report?.file) {
      return jsonError(appErrorFromUnknown("File not found", 404));
    }

    return buildStoredFilePreviewResponse(report.file);
  } catch (error) {
    console.error("Partner report preview failed", error);
    return jsonError(appErrorFromUnknown("Failed to load report file", 500));
  }
}
