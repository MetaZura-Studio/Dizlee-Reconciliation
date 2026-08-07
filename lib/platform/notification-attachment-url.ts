/**
 * Relative API URLs for OpCo/Partner notification attachment downloads.
 */
export function notificationAttachmentDownloadUrl(
  portal: "opco" | "partner",
  notificationId: string,
  attachmentId: string,
): string {
  return `/api/${portal}/notifications/${notificationId}/attachments/${attachmentId}`;
}
