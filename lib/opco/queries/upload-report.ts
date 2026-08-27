/**
 * OpCo initial report upload: file persistence, line items, audit, and Dizlee notify.
 *
 * Portal: OpCo. One report per partner/period on the OpCo lane; monthly multi-partner
 * uploads share one File + OpcoReportSubmission across partner reports.
 */

import { Prisma } from "@prisma/client";

import type { ParsedReportLine } from "@/lib/opco/excel/parse-report";
import { getOpcoLookupId } from "@/lib/opco/lookups";
import { isPartnerLinkedToOpco } from "@/lib/opco/queries/partners";
import type { OpcoPartnerBucket } from "@/lib/opco/queries/parse-monthly-buckets";
import { saveReportFileLocally } from "@/lib/opco/storage/save-report-file";
import { writePlatformAuditLog } from "@/lib/platform/audit-log";
import { notifyDizleeOpcoReportUpload } from "@/lib/platform/notify-opco-report-upload";
import {
  getOpcoReportFx,
  snapshotFxOntoParsedLines,
} from "@/lib/platform/report-fx";
import {
  OPCO_REPORT_VERSION,
  laneReportWhere,
} from "@/lib/platform/reports/sides";
import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export class ReportUploadError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ReportUploadError", keyOrMessage, status);
  }
}

type CreateReportUploadInput = {
  opcoId: bigint;
  userId: bigint;
  partnerId: bigint;
  year: number;
  month: number;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  lineItems: ParsedReportLine[];
  /** When set, reuse this file row instead of saving a new copy. */
  fileId?: bigint;
  submissionId?: bigint;
  /** Skip per-partner Dizlee notify (batch upload notifies once). */
  skipNotify?: boolean;
};

export async function createReportUpload(
  input: CreateReportUploadInput,
): Promise<{ reportId: string }> {
  const linked = await isPartnerLinkedToOpco(input.opcoId, input.partnerId);

  if (!linked) {
    throw new ReportUploadError("Partner is not linked to this OpCo", 403);
  }

  const [opco, submittedStatus] = await Promise.all([
    prisma.opco.findFirst({
      where: { id: input.opcoId },
      select: { defaultCurrencyId: true },
    }),
    prisma.lookup.findFirst({
      where: {
        code: "SUBMITTED",
        lookupType: { code: "REPORT_STATUS" },
      },
      select: { id: true },
    }),
  ]);

  if (!opco) {
    throw new ReportUploadError("OpCo not found", 404);
  }

  if (!submittedStatus) {
    throw new ReportUploadError("Report status configuration is missing", 500);
  }

  const fx = await getOpcoReportFx({
    opcoId: input.opcoId,
    month: input.month,
    year: input.year,
  });
  const lineItems = snapshotFxOntoParsedLines(input.lineItems, fx.rateToUsd);

  const existingReport = await prisma.report.findFirst({
    where: laneReportWhere("opco", {
      opcoId: input.opcoId,
      partnerId: input.partnerId,
      year: input.year,
      month: input.month,
    }),
    select: { id: true },
  });

  if (existingReport) {
    throw new ReportUploadError(
      "A report already exists for this partner and period",
      409,
    );
  }

  let fileId = input.fileId;

  if (!fileId) {
    const savedFile = await saveReportFileLocally({
      buffer: input.buffer,
      filename: input.filename,
      mimeType: input.mimeType,
    });

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
    fileId = file.id;
  }

  try {
    const report = await prisma.report.create({
      data: {
        month: input.month,
        year: input.year,
        opcoId: input.opcoId,
        partnerId: input.partnerId,
        fileId,
        submissionId: input.submissionId,
        currencyId: opco.defaultCurrencyId,
        statusId: submittedStatus.id,
        version: OPCO_REPORT_VERSION,
        createdByUserId: input.userId,
        uploadedByUserId: input.userId,
        updatedByUserId: input.userId,
        lineItems: {
          create: lineItems.map((item) => ({
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
        },
      },
      select: {
        id: true,
        opco: { select: { name: true } },
        partner: { select: { name: true } },
      },
    });

    await writePlatformAuditLog({
      actorUserId: input.userId,
      action: "REPORT_UPLOADED",
      entityType: "REPORT",
      entityId: report.id,
      message: `OpCo uploaded report for ${report.opco.name} / ${report.partner.name} (${input.year}-${String(input.month).padStart(2, "0")})`,
      metadata: {
        opcoId: input.opcoId.toString(),
        partnerId: input.partnerId.toString(),
        month: input.month,
        year: input.year,
        filename: input.filename,
        exchangeRate: fx.rateToUsd,
        submissionId: input.submissionId?.toString(),
      },
    });

    if (!input.skipNotify) {
      try {
        await notifyDizleeOpcoReportUpload({
          fromUserId: input.userId,
          opcoId: input.opcoId,
          opcoName: report.opco.name,
          partnerId: input.partnerId,
          partnerName: report.partner.name,
          month: input.month,
          year: input.year,
        });
      } catch (notifyError) {
        console.error(
          "[createReportUpload] Dizlee notification failed after report save:",
          notifyError,
        );
      }
    }

    return { reportId: report.id.toString() };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ReportUploadError(
        "A report already exists for this partner and period",
        409,
      );
    }

    throw error;
  }
}

type CreateMonthlySubmissionInput = {
  opcoId: bigint;
  userId: bigint;
  year: number;
  month: number;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  buckets: OpcoPartnerBucket[];
};

/**
 * Save one raw monthly file, create submission, split into partner reports sharing that file.
 */
export async function createOpcoMonthlySubmissionUpload(
  input: CreateMonthlySubmissionInput,
): Promise<{ submissionId: string; reportIds: string[]; lineItemCount: number }> {
  const existingSubmission = await prisma.opcoReportSubmission.findFirst({
    where: {
      opcoId: input.opcoId,
      year: input.year,
      month: input.month,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (existingSubmission) {
    throw new ReportUploadError(
      "A monthly report file already exists for this period. Use Re Upload Report after Dizlee approval to replace it.",
      409,
    );
  }

  const submittedStatusId = await getOpcoLookupId("REPORT_STATUS", "SUBMITTED");

  const savedFile = await saveReportFileLocally({
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });

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

  const submission = await prisma.opcoReportSubmission.create({
    data: {
      opcoId: input.opcoId,
      year: input.year,
      month: input.month,
      fileId: file.id,
      statusId: submittedStatusId,
      createdByUserId: input.userId,
      updatedByUserId: input.userId,
    },
    include: {
      opco: { select: { name: true } },
    },
  });

  const reportIds: string[] = [];
  let lineItemCount = 0;

  for (const bucket of input.buckets) {
    const result = await createReportUpload({
      opcoId: input.opcoId,
      userId: input.userId,
      partnerId: bucket.partnerId,
      year: input.year,
      month: input.month,
      filename: input.filename,
      mimeType: input.mimeType,
      buffer: input.buffer,
      lineItems: bucket.lineItems,
      fileId: file.id,
      submissionId: submission.id,
      skipNotify: true,
    });
    reportIds.push(result.reportId);
    lineItemCount += bucket.lineItems.length;
  }

  if (reportIds.length > 0) {
    const firstPartner = await prisma.partner.findFirst({
      where: { id: input.buckets[0]!.partnerId },
      select: { name: true },
    });
    try {
      await notifyDizleeOpcoReportUpload({
        fromUserId: input.userId,
        opcoId: input.opcoId,
        opcoName: submission.opco.name,
        partnerId: input.buckets[0]!.partnerId,
        partnerName: firstPartner?.name ?? "Partners",
        month: input.month,
        year: input.year,
      });
      // Merge remaining partners into the consolidated notification
      for (const bucket of input.buckets.slice(1)) {
        const partner = await prisma.partner.findFirst({
          where: { id: bucket.partnerId },
          select: { name: true },
        });
        if (!partner) continue;
        await notifyDizleeOpcoReportUpload({
          fromUserId: input.userId,
          opcoId: input.opcoId,
          opcoName: submission.opco.name,
          partnerId: bucket.partnerId,
          partnerName: partner.name,
          month: input.month,
          year: input.year,
        });
      }
    } catch (notifyError) {
      console.error(
        "[createOpcoMonthlySubmissionUpload] Dizlee notification failed:",
        notifyError,
      );
    }
  }

  return {
    submissionId: submission.id.toString(),
    reportIds,
    lineItemCount,
  };
}

/**
 * Override partner report line items for a monthly reupload (create if missing).
 */
export async function upsertOpcoPartnerReportFromBucket(params: {
  opcoId: bigint;
  userId: bigint;
  partnerId: bigint;
  year: number;
  month: number;
  fileId: bigint;
  submissionId: bigint;
  statusId: number;
  lineItems: ParsedReportLine[];
}): Promise<{ reportId: string }> {
  const linked = await isPartnerLinkedToOpco(params.opcoId, params.partnerId);
  if (!linked) {
    throw new ReportUploadError("Partner is not linked to this OpCo", 403);
  }

  const opco = await prisma.opco.findFirst({
    where: { id: params.opcoId },
    select: { defaultCurrencyId: true },
  });
  if (!opco) {
    throw new ReportUploadError("OpCo not found", 404);
  }

  const fx = await getOpcoReportFx({
    opcoId: params.opcoId,
    month: params.month,
    year: params.year,
  });
  const lineItems = snapshotFxOntoParsedLines(params.lineItems, fx.rateToUsd);
  const now = new Date();

  const existing = await prisma.report.findFirst({
    where: laneReportWhere("opco", {
      opcoId: params.opcoId,
      partnerId: params.partnerId,
      year: params.year,
      month: params.month,
    }),
    select: { id: true },
  });

  if (existing) {
    await prisma.reportLineItem.updateMany({
      where: { reportId: existing.id, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedByUserId: params.userId,
      },
    });

    await prisma.reportLineItem.createMany({
      data: lineItems.map((item) => ({
        reportId: existing.id,
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
      where: { id: existing.id },
      data: {
        fileId: params.fileId,
        submissionId: params.submissionId,
        statusId: params.statusId,
        uploadedByUserId: params.userId,
        updatedByUserId: params.userId,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
      },
    });

    return { reportId: existing.id.toString() };
  }

  const report = await prisma.report.create({
    data: {
      month: params.month,
      year: params.year,
      opcoId: params.opcoId,
      partnerId: params.partnerId,
      fileId: params.fileId,
      submissionId: params.submissionId,
      currencyId: opco.defaultCurrencyId,
      statusId: params.statusId,
      version: OPCO_REPORT_VERSION,
      createdByUserId: params.userId,
      uploadedByUserId: params.userId,
      updatedByUserId: params.userId,
      lineItems: {
        create: lineItems.map((item) => ({
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
      },
    },
    select: { id: true },
  });

  return { reportId: report.id.toString() };
}
