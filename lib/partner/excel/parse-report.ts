/**
 * Partner report Excel parsing entry point.
 *
 * Portal: Partner. Uses platform parser then merges hyphen-prefix service
 * variants (e.g. GameZilla-GBOnline + GameZilla-GOnline → GameZilla).
 */

import { mergePartnerLinesByServicePrefix } from "@/lib/partner/excel/merge-lines-by-service-prefix";
import {
  ReportParseError,
  parseReportWorkbook as parsePlatformReportWorkbook,
  type ParsedReportLine,
} from "@/lib/platform/excel/parse-report";

export { ReportParseError, type ParsedReportLine };

export async function parseReportWorkbook(
  ...args: Parameters<typeof parsePlatformReportWorkbook>
): Promise<ParsedReportLine[]> {
  const lines = await parsePlatformReportWorkbook(...args);
  return mergePartnerLinesByServicePrefix(lines);
}
