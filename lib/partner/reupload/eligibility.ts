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
