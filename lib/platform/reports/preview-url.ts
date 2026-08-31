/**
 * API path helper for inline report raw-file preview across OpCo, Partner, and Dizlee portals.
 */
export function reportRawFilePreviewUrl(
  portal: "opco" | "partner" | "dizlee",
  reportId: string,
): string {
  return `/api/${portal}/reports/${reportId}/preview`;
}

/** OpCo monthly submission raw-file preview. */
export function opcoSubmissionRawFilePreviewUrl(submissionId: string): string {
  return `/api/opco/submissions/${submissionId}/preview`;
}

/** Dizlee preview for OpCo monthly submission raw file. */
export function dizleeSubmissionRawFilePreviewUrl(submissionId: string): string {
  return `/api/dizlee/submissions/${submissionId}/preview`;
}
