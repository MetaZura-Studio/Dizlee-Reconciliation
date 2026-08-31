/**
 * OpCo report reupload after an approved change request.
 *
 * Portal: OpCo. Replaces file and line items in place, marks request completed, sets
 * RESUBMITTED. Eligibility must match `mapReuploadEligibility` before calling.
 */

import { Prisma } from "@prisma/client";

import type { ParsedReportLine } from "@/lib/opco/excel/parse-report";
import { formatPeriodLabel } from "@/lib/opco/period";
import { getOpcoLookupId } from "@/lib/opco/lookups";
import { mapReuploadEligibility } from "@/lib/opco/reupload/eligibility";
import { saveReportFileLocally } from "@/lib/opco/storage/save-report-file";
import { notifyDizleeUsers } from "@/lib/platform/notify-dizlee";
import {
  buildOpcoReportResubmittedBody,
  OPCO_REPORT_RESUBMITTED_SUBJECT,
  type OpcoReportResubmittedMetadata,
} from "@/lib/platform/notification-metadata";
import {
  softDeleteOpcoPeriodConsolidation,
  softDeletePartnerReconciliations,
} from "@/lib/platform/reconciliation/invalidate-after-reupload";
import {
  linesFromStoredReportItems,
  partnerLinesChanged,
} from "@/lib/platform/reconciliation/partner-line-fingerprint";
import {
  getOpcoReportFx,
  snapshotFxOntoParsedLines,
} from "@/lib/platform/report-fx";
import { OPCO_REPORT_VERSION } from "@/lib/platform/reports/sides";
import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export class ReportReuploadError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ReportReuploadError", keyOrMessage, status);
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
      version: OPCO_REPORT_VERSION,
      isDeleted: false,
    },
    include: {
      status: { select: { code: true } },
      opco: { select: { name: true } },
      partner: { select: { name: true } },
      lineItems: {
        where: { isDeleted: false },
        select: {
          description: true,
          lineNumber: true,
          amount: true,
          usageAmount: true,
          usageUsd: true,
          revenueSharePercent: true,
          reconciliationBasis: true,
          usageUnit: true,
        },
      },
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

  const fx = await getOpcoReportFx({
    opcoId: input.opcoId,
    month: report.month,
    year: report.year,
  });
  const lineItems = snapshotFxOntoParsedLines(input.lineItems, fx.rateToUsd);
  const linesChanged = partnerLinesChanged(
    linesFromStoredReportItems(report.lineItems),
    lineItems,
  );

  await prisma.reportLineItem.createMany({
    data: lineItems.map((item) => ({
      reportId: input.reportId,
      lineNumber: item.lineNumber,
      description: item.description,
      usageAmount: item.usageAmount,
      usageUsd: item.usageUsd,
      amount: item.amount,
      revenueSharePercent: item.revenueSharePercent,
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

  if (linesChanged) {
    await softDeletePartnerReconciliations({
      opcoId: input.opcoId,
      partnerId: report.partnerId,
      year: report.year,
      month: report.month,
      deletedByUserId: input.userId,
      deletedAt: completedAt,
    });
    await softDeleteOpcoPeriodConsolidation({
      opcoId: input.opcoId,
      year: report.year,
      month: report.month,
      deletedByUserId: input.userId,
      deletedAt: completedAt,
    });

    const partners = [
      {
        id: report.partnerId.toString(),
        name: report.partner.name,
      },
    ];
    const metadata: OpcoReportResubmittedMetadata = {
      type: "OPCO_REPORT_RESUBMITTED",
      opcoId: input.opcoId.toString(),
      opcoName: report.opco.name,
      month: report.month,
      year: report.year,
      partners,
    };

    try {
      await notifyDizleeUsers({
        fromUserId: input.userId,
        subject: OPCO_REPORT_RESUBMITTED_SUBJECT,
        body: buildOpcoReportResubmittedBody({
          opcoName: report.opco.name,
          periodLabel: formatPeriodLabel(report.year, report.month),
          partners,
        }),
        metadata,
      });
    } catch {
      // Resubmit succeeded; notification failure must not roll back file replace.
    }
  }

  return {
    reportId: input.reportId.toString(),
    lineItemCount: lineItems.length,
  };
}
