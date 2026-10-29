/**
 * Excel percent numFmt helpers shared by OpCo parse and upload preview.
 */

/**
 * True for Excel native percent formats (`0%`, `0.00%`) where the stored
 * value is a fraction (0.63 → 63%). False for formats that only append a
 * literal `%` in quotes (e.g. our RS export `0.00"%"` with value already 63).
 */
export function isExcelFractionalPercentFmt(numFmt: string): boolean {
  const withoutLiterals = numFmt.replace(/"[^"]*"/g, "");
  return withoutLiterals.includes("%");
}

/** True when numFmt appends a literal % (e.g. `0.00"%"`). */
export function hasLiteralPercentSuffix(numFmt: string): boolean {
  return /"%"|'%/.test(numFmt);
}
