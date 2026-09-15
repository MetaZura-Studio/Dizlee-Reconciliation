/**
 * Partner report preview header display — amounts are always USD.
 */

/** Show USD in Partner upload/raw previews even if the sheet still says (LC). */
export function displayPartnerPreviewHeader(header: string): string {
  const trimmed = header.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/^gross\s*amount\s*\(\s*lc\s*\)$/i.test(trimmed)) {
    return "Gross amount (USD)";
  }
  return trimmed;
}
