/**
 * OpCo report reupload eligibility from status and change-request workflow.
 *
 * Portal: OpCo. Reupload is allowed only when status is CHANGE_REQUESTED and an
 * approved, not-yet-completed change request exists.
 */

export type ReuploadChangeRequestState = {
  decidedAt: string | null;
  completedAt: string | null;
  statusCode: string;
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
