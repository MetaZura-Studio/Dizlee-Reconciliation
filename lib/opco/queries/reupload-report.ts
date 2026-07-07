import { Prisma } from "@prisma/client";

import type { ParsedReportLine } from "@/lib/opco/excel/parse-report";
import { getOpcoLookupId } from "@/lib/opco/lookups";
import { mapReuploadEligibility } from "@/lib/opco/reupload/eligibility";
import { saveReportFileLocally } from "@/lib/opco/storage/save-report-file";
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
  opcoId: bigint;
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
      opcoId: input.opcoId,
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

  const resubmittedStatusId = await getOpcoLookupId("REPORT_STATUS", "RESUBMITTED");

  const savedFile = await saveReportFileLocally({
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });

  const completedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const completed = await tx.reportChangeRequest.updateMany({
      where: {
        id: approvedRequest.id,
        completedAt: null,
      },
      data: { completedAt },
    });

    if (completed.count === 0) {
      throw new ReportReuploadError("Reupload request is no longer available", 409);
    }

    const file = await tx.file.create({
      data: {
        filename: input.filename,
        storageKey: savedFile.storageKey,
        mimeType: input.mimeType,
        sizeBytes: savedFile.sizeBytes,
        checksum: savedFile.checksum,
        uploadedByUserId: input.userId,
      },
    });

    await tx.reportLineItem.updateMany({
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

    await tx.reportLineItem.createMany({
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

    await tx.report.update({
      where: { id: input.reportId },
      data: {
        fileId: file.id,
        statusId: resubmittedStatusId,
        uploadedByUserId: input.userId,
        updatedByUserId: input.userId,
      },
    });
  });

  return {
    reportId: input.reportId.toString(),
    lineItemCount: input.lineItems.length,
  };
}
