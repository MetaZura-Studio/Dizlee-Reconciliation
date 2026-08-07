/**
 * API path helper for inline report raw-file preview across OpCo, Partner, and Dizlee portals.
 */
export function reportRawFilePreviewUrl(
  portal: "opco" | "partner" | "dizlee",
  reportId: string,
): string {
  return `/api/${portal}/reports/${reportId}/preview`;
}
