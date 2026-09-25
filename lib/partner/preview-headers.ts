/**
 * Partner report preview header display.
 * Gross Amount may be local; Local Currency (LC) / Currency column shows the ISO.
 */

/** Normalize Partner upload/raw preview headers for display. */
export function displayPartnerPreviewHeader(header: string): string {
  const trimmed = header.trim();
  if (!trimmed) {
    return trimmed;
  }
  // Keep Gross Amount as Gross Amount (local); do not force "(USD)".
  if (/^gross\s*amount\s*\(\s*lc\s*\)$/i.test(trimmed)) {
    return "Gross amount";
  }
  if (/^gross\s*amount\s*\(\s*usd\s*\)$/i.test(trimmed)) {
    return "Gross amount";
  }
  if (/^local\s*currency\s*\(\s*lc\s*\)$/i.test(trimmed)) {
    return "Local currency";
  }
  return trimmed;
}
