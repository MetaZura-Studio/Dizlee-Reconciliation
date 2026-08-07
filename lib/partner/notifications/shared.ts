/**
 * Partner inbox notification body truncation for list previews.
 *
 * Portal: Partner. Collapses whitespace; ellipsis appended when exceeding preview length.
 */

const BODY_PREVIEW_LENGTH = 120;

export function trimNotificationPreview(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= BODY_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, BODY_PREVIEW_LENGTH - 1)}…`;
}
