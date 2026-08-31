/**
 * OpCo monthly submission reupload after Dizlee approves a submission change request.
 * Overrides that month’s raw file and partner report data; hard-deletes all
 * reconciliations, consolidation, and revenue-share work for the OpCo period.
 */

import { formatPeriodLabel } from "@/lib/opco/period";
import { getOpcoLookupId } from "@/lib/opco/lookups";
import {
  parseOpcoMonthlyPartnerBuckets,
} from "@/lib/opco/queries/parse-monthly-buckets";
import { upsertOpcoPartnerReportFromBucket } from "@/lib/opco/queries/upload-report";
import { isSubmissionReuploadEligible } from "@/lib/opco/reupload/submission-eligibility";
import { saveReportFileLocally } from "@/lib/opco/storage/save-report-file";
import { hardDeleteAllOpcoPeriodWork } from "@/lib/platform/reconciliation/invalidate-after-reupload";
import { OPCO_REPORT_VERSION } from "@/lib/platform/reports/sides";
import { notifyDizleeUsers } from "@/lib/platform/notify-dizlee";
import {
  buildOpcoReportResubmittedBody,
  OPCO_REPORT_RESUBMITTED_SUBJECT,
  type OpcoReportResubmittedMetadata,
} from "@/lib/platform/notification-metadata";
import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export class SubmissionReuploadError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("SubmissionReuploadError", keyOrMessage, status);
  }
}

type ReuploadInput = {
  opcoId: bigint;
  userId: bigint;
  submissionId: bigint;
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export async function reuploadOpcoMonthlySubmission(
  input: ReuploadInput,
): Promise<{ submissionId: string; partnerCount: number; lineItemCount: number }> {
  const submission = await prisma.opcoReportSubmission.findFirst({
    where: {
      id: input.submissionId,
      opcoId: input.opcoId,
      isDeleted: false,
    },
    include: {
      status: { select: { code: true } },
      opco: { select: { name: true } },
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

  if (!submission) {
    throw new SubmissionReuploadError("Monthly report file not found", 404);
  }

  if (
    !isSubmissionReuploadEligible(
      submission.status.code,
      submission.changeRequests.map((request) => ({
        decidedAt: request.decidedAt?.toISOString() ?? null,
        completedAt: request.completedAt?.toISOString() ?? null,
        statusCode: request.status.code,
      })),
    )
  ) {
    throw new SubmissionReuploadError(
      "Reupload is only allowed after Dizlee approves a change request",
      400,
    );
  }

  const approvedRequest = submission.changeRequests.find(
    (request) =>
      request.decidedAt !== null &&
      request.completedAt === null &&
      request.status.code === "APPROVED",
  );

  if (!approvedRequest) {
    throw new SubmissionReuploadError(
      "No approved reupload request found for this monthly file",
      400,
    );
  }

  const { buckets } = await parseOpcoMonthlyPartnerBuckets({
    opcoId: input.opcoId,
    buffer: input.buffer,
  });

  if (buckets.length === 0) {
    throw new SubmissionReuploadError(
      "No partner rows found in the uploaded file",
      400,
    );
  }

  const resubmittedStatusId = await getOpcoLookupId(
    "REPORT_STATUS",
    "RESUBMITTED",
  );

  const savedFile = await saveReportFileLocally({
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });

  const completedAt = new Date();

  const completed = await prisma.opcoSubmissionChangeRequest.updateMany({
    where: {
      id: approvedRequest.id,
      completedAt: null,
    },
    data: { completedAt },
  });

  if (completed.count === 0) {
    throw new SubmissionReuploadError(
      "Reupload request is no longer available",
      409,
    );
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

  await prisma.opcoReportSubmission.update({
    where: { id: submission.id },
    data: {
      fileId: file.id,
      statusId: resubmittedStatusId,
      updatedByUserId: input.userId,
    },
  });

  const existingReports = await prisma.report.findMany({
    where: {
      submissionId: submission.id,
      opcoId: input.opcoId,
      version: OPCO_REPORT_VERSION,
      isDeleted: false,
    },
    select: {
      id: true,
      partnerId: true,
    },
  });

  const keptPartnerIds = new Set(
    buckets.map((bucket) => bucket.partnerId.toString()),
  );
  let lineItemCount = 0;

  const partnerNames = await prisma.partner.findMany({
    where: { id: { in: buckets.map((bucket) => bucket.partnerId) } },
    select: { id: true, name: true },
  });
  const partnerNameById = new Map(
    partnerNames.map((partner) => [partner.id.toString(), partner.name]),
  );

  for (const bucket of buckets) {
    await upsertOpcoPartnerReportFromBucket({
      opcoId: input.opcoId,
      userId: input.userId,
      partnerId: bucket.partnerId,
      year: submission.year,
      month: submission.month,
      fileId: file.id,
      submissionId: submission.id,
      statusId: resubmittedStatusId,
      lineItems: bucket.lineItems,
    });
    lineItemCount += bucket.lineItems.length;
  }

  for (const report of existingReports) {
    if (keptPartnerIds.has(report.partnerId.toString())) {
      continue;
    }
    await prisma.reportLineItem.updateMany({
      where: { reportId: report.id, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: completedAt,
        deletedByUserId: input.userId,
      },
    });
    await prisma.report.update({
      where: { id: report.id },
      data: {
        isDeleted: true,
        deletedAt: completedAt,
        deletedByUserId: input.userId,
        updatedByUserId: input.userId,
      },
    });
  }

  await hardDeleteAllOpcoPeriodWork({
    opcoId: input.opcoId,
    year: submission.year,
    month: submission.month,
  });

  const partnersInFile = buckets
    .map((bucket) => ({
      id: bucket.partnerId.toString(),
      name:
        partnerNameById.get(bucket.partnerId.toString()) ??
        `Partner ${bucket.partnerId.toString()}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const periodLabel = formatPeriodLabel(submission.year, submission.month);
  const metadata: OpcoReportResubmittedMetadata = {
    type: "OPCO_REPORT_RESUBMITTED",
    opcoId: input.opcoId.toString(),
    opcoName: submission.opco.name,
    month: submission.month,
    year: submission.year,
    partners: partnersInFile,
  };

  try {
    await notifyDizleeUsers({
      fromUserId: input.userId,
      subject: OPCO_REPORT_RESUBMITTED_SUBJECT,
      body: buildOpcoReportResubmittedBody({
        opcoName: submission.opco.name,
        periodLabel,
        partners: partnersInFile,
      }),
      metadata,
    });
  } catch {
    // Resubmit succeeded; notification failure must not roll back file replace.
  }

  return {
    submissionId: submission.id.toString(),
    partnerCount: buckets.length,
    lineItemCount,
  };
}
