export function notificationAttachmentDownloadUrl(
  portal: "opco" | "partner",
  notificationId: string,
  attachmentId: string,
): string {
  return `/api/${portal}/notifications/${notificationId}/attachments/${attachmentId}`;
}
