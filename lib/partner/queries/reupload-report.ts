import { Prisma } from "@prisma/client";

import type { ParsedReportLine } from "@/lib/partner/excel/parse-report";
import { getPartnerLookupId } from "@/lib/partner/lookups";
import { mapReuploadEligibility } from "@/lib/partner/reupload/eligibility";
import { saveReportFileLocally } from "@/lib/partner/storage/save-report-file";
import { PARTNER_REPORT_VERSION } from "@/lib/platform/reports/sides";
import prisma from "@/lib/prisma";

export class ReportReuploadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReportReuploadError";
    this.status = status;
  }
}

type ReuploadCorrectedReportInput = {
  partnerId: bigint;
  userId: bigint;
  reportId: bigint;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  lineItems: ParsedReportLine[];
};

export async function reuploadCorrectedReport(
  input: ReuploadCorrectedReportInput,
): Promise<{ reportId: string; lineItemCount: number }> {
  const report = await prisma.report.findFirst({
    where: {
      id: input.reportId,
      partnerId: input.partnerId,
      version: PARTNER_REPORT_VERSION,
    },
    include: {
      status: { select: { code: true } },
      changeRequests: {
        select: {
          id: true,
          decidedAt: true,
          completedAt: true,
          status: { select: { code: true } },
        },
      },
    },
  });

  if (!report) {
    throw new ReportReuploadError("Report not found", 404);
  }

  if (!mapReuploadEligibility(report.status.code, report.changeRequests)) {
    throw new ReportReuploadError(
      "Reupload is only allowed after Dizlee approves a change request",
      400,
    );
  }

  const approvedRequest = report.changeRequests.find(
    (request) =>
      request.decidedAt !== null &&
      request.completedAt === null &&
      request.status.code === "APPROVED",
  );

  if (!approvedRequest) {
    throw new ReportReuploadError(
      "No approved reupload request found for this report",
      400,
    );
  }

  const resubmittedStatusId = await getPartnerLookupId("REPORT_STATUS", "RESUBMITTED");

  const savedFile = await saveReportFileLocally({
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });

  const completedAt = new Date();

  const completed = await prisma.reportChangeRequest.updateMany({
    where: {
      id: approvedRequest.id,
      completedAt: null,
    },
    data: { completedAt },
  });

  if (completed.count === 0) {
    throw new ReportReuploadError("Reupload request is no longer available", 409);
  }

  const file = await prisma.file.create({
    data: {
      filename: input.filename,
      storageKey: savedFile.storageKey,
      mimeType: input.mimeType,
      sizeBytes: savedFile.sizeBytes,
      checksum: savedFile.checksum,
      uploadedByUserId: input.userId,
    },
  });

  await prisma.reportLineItem.updateMany({
    where: {
      reportId: input.reportId,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
      deletedAt: completedAt,
      deletedByUserId: input.userId,
    },
  });

  await prisma.reportLineItem.createMany({
    data: input.lineItems.map((item) => ({
      reportId: input.reportId,
      lineNumber: item.lineNumber,
      description: item.description,
      usageAmount: item.usageAmount,
      usageUsd: item.usageUsd,
      amount: item.amount,
      exchangeRate: item.exchangeRate,
      usageUnit: item.usageUnit,
      reconciliationBasis: item.reconciliationBasis,
      sourceColumns: item.sourceColumns as Prisma.InputJsonValue,
    })),
  });

  await prisma.report.update({
    where: { id: input.reportId },
    data: {
      fileId: file.id,
      statusId: resubmittedStatusId,
      uploadedByUserId: input.userId,
      updatedByUserId: input.userId,
    },
  });

  return {
    reportId: input.reportId.toString(),
    lineItemCount: input.lineItems.length,
  };
}
