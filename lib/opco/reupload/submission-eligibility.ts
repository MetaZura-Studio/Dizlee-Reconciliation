/**
 * OpCo monthly submission reupload eligibility (approved, unfinished change request).
 */

export type SubmissionChangeRequestState = {
  decidedAt: string | null;
  completedAt: string | null;
  statusCode: string;
};

export function isSubmissionReuploadEligible(
  submissionStatusCode: string,
  changeRequests: SubmissionChangeRequestState[],
): boolean {
  if (submissionStatusCode !== "CHANGE_REQUESTED") {
    return false;
  }

  return changeRequests.some(
    (request) =>
      request.decidedAt !== null &&
      request.completedAt === null &&
      request.statusCode === "APPROVED",
  );
}

export function mapSubmissionReuploadEligibility(
  submissionStatusCode: string,
  changeRequests: Array<{
    decidedAt: Date | null;
    completedAt: Date | null;
    status: { code: string };
  }>,
): boolean {
  return isSubmissionReuploadEligible(
    submissionStatusCode,
    changeRequests.map((request) => ({
      decidedAt: request.decidedAt?.toISOString() ?? null,
      completedAt: request.completedAt?.toISOString() ?? null,
      statusCode: request.status.code,
    })),
  );
}
