/**
 * Partner report reupload eligibility from status and change-request workflow.
 *
 * Portal: Partner. Reupload is allowed only when status is CHANGE_REQUESTED and an
 * approved, not-yet-completed change request exists.
 */

export type ReuploadChangeRequestState = {
  decidedAt: string | null;
  completedAt: string | null;
  statusCode: string;
};

const REQUESTABLE_REPORT_STATUSES = new Set([
  "SUBMITTED",
  "APPROVED",
  "RESUBMITTED",
]);

export type PartnerReportReuploadFlags = {
  hasPendingChangeRequest: boolean;
  canRequestReupload: boolean;
  canReupload: boolean;
  reuploadReason: string | null;
};

export function isReportReuploadEligible(
  reportStatusCode: string,
  changeRequests: ReuploadChangeRequestState[],
): boolean {
  if (reportStatusCode !== "CHANGE_REQUESTED") {
    return false;
  }

  return changeRequests.some(
    (request) =>
      request.decidedAt !== null &&
      request.completedAt === null &&
      request.statusCode === "APPROVED",
  );
}

/** Adapts Prisma change-request rows to {@link isReportReuploadEligible}. */
export function mapReuploadEligibility(
  reportStatusCode: string,
  changeRequests: Array<{
    decidedAt: Date | null;
    completedAt: Date | null;
    status: { code: string };
  }>,
): boolean {
  return isReportReuploadEligible(
    reportStatusCode,
    changeRequests.map((request) => ({
      decidedAt: request.decidedAt?.toISOString() ?? null,
      completedAt: request.completedAt?.toISOString() ?? null,
      statusCode: request.status.code,
    })),
  );
}

/** Shared flags for list, detail, and Upload period gate. */
export function mapPartnerReportReuploadFlags(
  reportStatusCode: string,
  changeRequests: Array<{
    reason?: string | null;
    decidedAt: Date | null;
    completedAt: Date | null;
    status: { code: string };
  }>,
): PartnerReportReuploadFlags {
  const hasPendingChangeRequest = changeRequests.some(
    (request) => request.decidedAt === null,
  );
  const canReupload = mapReuploadEligibility(reportStatusCode, changeRequests);
  const canRequestReupload =
    REQUESTABLE_REPORT_STATUSES.has(reportStatusCode) &&
    !hasPendingChangeRequest &&
    !canReupload;
  const approvedOpen = changeRequests.find(
    (request) =>
      request.decidedAt !== null &&
      request.completedAt === null &&
      request.status.code === "APPROVED",
  );
  const pending = changeRequests.find((request) => request.decidedAt === null);

  return {
    hasPendingChangeRequest,
    canRequestReupload,
    canReupload,
    reuploadReason: approvedOpen?.reason ?? pending?.reason ?? null,
  };
}
