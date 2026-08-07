/**
 * OpCo report Excel parsing entry point.
 *
 * Portal: OpCo. Re-exports platform parser — extend parsing rules in
 * `@/lib/platform/excel/parse-report`, not here.
 */

export {
  ReportParseError,
  parseReportWorkbook,
  type ParsedReportLine,
} from "@/lib/platform/excel/parse-report";
