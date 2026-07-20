export function reportRawFilePreviewUrl(
  portal: "opco" | "partner" | "dizlee",
  reportId: string,
): string {
  return `/api/${portal}/reports/${reportId}/preview`;
}
