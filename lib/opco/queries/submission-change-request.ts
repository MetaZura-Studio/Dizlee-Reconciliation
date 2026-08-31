/**
 * OpCo monthly submission change requests (reupload permission) for Dizlee review.
 */

import { formatPeriodLabel } from "@/lib/opco/period";
import { getOpcoLookupId } from "@/lib/opco/lookups";
import { writePlatformAuditLog } from "@/lib/platform/audit-log";
import { notifyDizleeUsers } from "@/lib/platform/notify-dizlee";
import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export class SubmissionChangeRequestError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("SubmissionChangeRequestError", keyOrMessage, status);
  }
}

const REQUESTABLE_STATUSES = new Set(["SUBMITTED", "APPROVED", "RESUBMITTED"]);

type CreateInput = {
  opcoId: bigint;
  userId: bigint;
  submissionId: bigint;
  reason: string;
};

export async function createOpcoSubmissionChangeRequest(
  input: CreateInput,
): Promise<{ changeRequestId: string }> {
  const submission = await prisma.opcoReportSubmission.findFirst({
    where: {
      id: input.submissionId,
      opcoId: input.opcoId,
      isDeleted: false,
    },
    include: {
      opco: { select: { name: true } },
      status: { select: { code: true } },
      file: { select: { filename: true } },
    },
  });

  if (!submission) {
    throw new SubmissionChangeRequestError("Monthly report file not found", 404);
  }

  if (!REQUESTABLE_STATUSES.has(submission.status.code)) {
    throw new SubmissionChangeRequestError(
      "Only submitted monthly reports can have a reupload requested",
      400,
    );
  }

  const pendingRequest = await prisma.opcoSubmissionChangeRequest.findFirst({
    where: {
      submissionId: input.submissionId,
      decidedAt: null,
    },
    select: { id: true },
  });

  if (pendingRequest) {
    throw new SubmissionChangeRequestError(
      "A pending reupload request already exists for this monthly file",
      409,
    );
  }

  const approvedOpen = await prisma.opcoSubmissionChangeRequest.findFirst({
    where: {
      submissionId: input.submissionId,
      decidedAt: { not: null },
      completedAt: null,
      status: { code: "APPROVED" },
    },
    select: { id: true },
  });

  if (approvedOpen) {
    throw new SubmissionChangeRequestError(
      "A reupload is already approved for this monthly file. Upload the corrected file from Ready to re-upload.",
      409,
    );
  }

  const pendingStatusId = await getOpcoLookupId("REPORT_STATUS", "PENDING");

  const changeRequest = await prisma.opcoSubmissionChangeRequest.create({
    data: {
      submissionId: input.submissionId,
      requestedByUserId: input.userId,
      statusId: pendingStatusId,
      reason: input.reason,
    },
    select: { id: true },
  });

  const periodLabel = formatPeriodLabel(submission.year, submission.month);

  await notifyDizleeUsers({
    fromUserId: input.userId,
    subject: "OpCo monthly report reupload requested",
    body: `${submission.opco.name} requested a reupload for their monthly report (${periodLabel}). Reason: ${input.reason}`,
    metadata: {
      type: "OPCO_REUPLOAD_REQUEST",
      opcoId: submission.opcoId.toString(),
      opcoName: submission.opco.name,
      partnerId: "",
      partnerName: "All partners",
      reportId: input.submissionId.toString(),
      changeRequestId: changeRequest.id.toString(),
      month: submission.month,
      year: submission.year,
    },
  });

  await writePlatformAuditLog({
    actorUserId: input.userId,
    action: "REPORT_CHANGE_REQUESTED",
    entityType: "REPORT",
    entityId: input.submissionId,
    message: `OpCo requested monthly report reupload for ${submission.opco.name} (${periodLabel})`,
    metadata: {
      changeRequestId: changeRequest.id.toString(),
      submissionId: input.submissionId.toString(),
      reason: input.reason,
    },
  });

  return { changeRequestId: changeRequest.id.toString() };
}
