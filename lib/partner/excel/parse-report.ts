/**
 * Partner report Excel parsing entry point.
 *
 * Portal: Partner. Thin wrapper over the platform parser — each service
 * name stays its own line (no hyphen-prefix consolidation).
 */

import {
  ReportParseError,
  parseReportWorkbook as parsePlatformReportWorkbook,
  type ParsedReportLine,
} from "@/lib/platform/excel/parse-report";

export { ReportParseError, type ParsedReportLine };

export async function parseReportWorkbook(
  ...args: Parameters<typeof parsePlatformReportWorkbook>
): Promise<ParsedReportLine[]> {
  return parsePlatformReportWorkbook(...args);
}
