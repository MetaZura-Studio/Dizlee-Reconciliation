/**
 * OpCo monthly submission lists for Report History reupload section.
 */

import { formatPeriodLabel, getDefaultPeriod } from "@/lib/opco/period";
import { mapSubmissionReuploadEligibility } from "@/lib/opco/reupload/submission-eligibility";
import prisma from "@/lib/prisma";

export type OpcoSubmissionListItem = {
  id: string;
  year: number;
  month: number;
  periodLabel: string;
  statusLabel: string;
  statusCode: string;
  filename: string | null;
  uploadedAt: string;
  hasPendingChangeRequest: boolean;
  canRequestReupload: boolean;
  canReupload: boolean;
  reuploadReason: string | null;
};

const REQUESTABLE_STATUSES = new Set(["SUBMITTED", "APPROVED", "RESUBMITTED"]);

function mapSubmissionRow(submission: {
  id: bigint;
  year: number;
  month: number;
  createdAt: Date;
  status: { code: string; label: string };
  file: { filename: string } | null;
  changeRequests: Array<{
    reason: string | null;
    decidedAt: Date | null;
    completedAt: Date | null;
    status: { code: string };
  }>;
}): OpcoSubmissionListItem {
  const hasPendingChangeRequest = submission.changeRequests.some(
    (request) => request.decidedAt === null,
  );
  const approvedOpen = submission.changeRequests.find(
    (request) =>
      request.decidedAt !== null &&
      request.completedAt === null &&
      request.status.code === "APPROVED",
  );
  const canReupload = mapSubmissionReuploadEligibility(
    submission.status.code,
    submission.changeRequests,
  );
  const canRequestReupload =
    REQUESTABLE_STATUSES.has(submission.status.code) &&
    !hasPendingChangeRequest &&
    !canReupload;

  return {
    id: submission.id.toString(),
    year: submission.year,
    month: submission.month,
    periodLabel: formatPeriodLabel(submission.year, submission.month),
    statusLabel: submission.status.label,
    statusCode: submission.status.code,
    filename: submission.file?.filename ?? null,
    uploadedAt: submission.createdAt.toISOString(),
    hasPendingChangeRequest,
    canRequestReupload,
    canReupload,
    reuploadReason:
      approvedOpen?.reason ??
      submission.changeRequests.find((request) => request.decidedAt === null)
        ?.reason ??
      null,
  };
}

const submissionInclude = {
  status: { select: { code: true, label: true } },
  file: { select: { filename: true } },
  changeRequests: {
    select: {
      reason: true,
      decidedAt: true,
      completedAt: true,
      status: { select: { code: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

/**
 * All monthly submissions for the Re Upload page (requestable, pending, or ready).
 */
export async function listOpcoSubmissionsForReuploadPage(
  opcoId: bigint,
): Promise<{
  items: OpcoSubmissionListItem[];
  currentPeriod: { year: number; month: number; periodLabel: string };
  hasFileForCurrentPeriod: boolean;
}> {
  const current = getDefaultPeriod();
  const rows = await prisma.opcoReportSubmission.findMany({
    where: {
      opcoId,
      isDeleted: false,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    include: submissionInclude,
  });

  const items = rows.map(mapSubmissionRow);
  const hasFileForCurrentPeriod = items.some(
    (item) => item.year === current.year && item.month === current.month,
  );

  return {
    items,
    currentPeriod: {
      year: current.year,
      month: current.month,
      periodLabel: formatPeriodLabel(current.year, current.month),
    },
    hasFileForCurrentPeriod,
  };
}

/** Single monthly submission for OpCo + period, or null if none. */
export async function getOpcoSubmissionForPeriod(
  opcoId: bigint,
  year: number,
  month: number,
): Promise<OpcoSubmissionListItem | null> {
  const row = await prisma.opcoReportSubmission.findFirst({
    where: {
      opcoId,
      year,
      month,
      isDeleted: false,
    },
    include: submissionInclude,
  });
  return row ? mapSubmissionRow(row) : null;
}

/** @deprecated Prefer {@link listOpcoSubmissionsForReuploadPage}. */
export async function listRequestableSubmissionsForOpco(
  opcoId: bigint,
): Promise<OpcoSubmissionListItem[]> {
  const { items } = await listOpcoSubmissionsForReuploadPage(opcoId);
  return items.filter((item) => item.canRequestReupload);
}

/** @deprecated Prefer {@link listOpcoSubmissionsForReuploadPage}. */
export async function listReuploadReadySubmissionsForOpco(
  opcoId: bigint,
): Promise<OpcoSubmissionListItem[]> {
  const { items } = await listOpcoSubmissionsForReuploadPage(opcoId);
  return items.filter((item) => item.canReupload);
}
