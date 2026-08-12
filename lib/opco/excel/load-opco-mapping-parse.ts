/**
 * Load Admin OpCo column mapping into a parser config (including preferred sheet).
 */
import { parseStoredSampleHeaders } from "@/lib/admin/opco-report-mapping-excel";
import { getOpcoReportMappingByOpcoId } from "@/lib/admin/opco-report-mappings";
import {
  assertOpcoMappingReady,
  type OpcoMappingParseConfig,
} from "@/lib/opco/excel/parse-mapped-opco-report";
import {
  ReportParseError,
  type ParsedReportLine,
} from "@/lib/opco/excel/parse-report";
import type { ResolvedServicePartnerLine } from "@/lib/platform/service-partner-map";

export function toParsedLines(
  lines: ResolvedServicePartnerLine[],
): ParsedReportLine[] {
  return lines.map((line, index) => ({
    lineNumber: index + 1,
    description: line.description,
    usageAmount: null,
    usageUsd: null,
    amount: line.amount,
    revenueSharePercent: line.revenueSharePercent,
    exchangeRate: null,
    usageUnit: null,
    reconciliationBasis: null,
    sourceColumns: line.sourceColumns,
  }));
}

export async function loadOpcoMappingParseConfig(
  opcoId: bigint,
): Promise<{
  mapping: NonNullable<Awaited<ReturnType<typeof getOpcoReportMappingByOpcoId>>>;
  config: OpcoMappingParseConfig | null;
  preferredSheetName: string | null;
}> {
  const mapping = await getOpcoReportMappingByOpcoId(opcoId);
  if (!mapping) {
    throw new ReportParseError(
      "OpCo report column mapping is not configured. Ask an admin to set it under OpCos → Report map.",
    );
  }

  const preferredSheetName = parseStoredSampleHeaders(mapping.headersJson).sheetName;

  if (!mapping.serviceColumn?.trim() || !mapping.revenueColumn?.trim()) {
    return { mapping, config: null, preferredSheetName };
  }

  return {
    mapping,
    preferredSheetName,
    config: assertOpcoMappingReady({
      serviceColumn: mapping.serviceColumn,
      partnerMode: mapping.partnerMode,
      partnerColumn: mapping.partnerColumn,
      revenueColumn: mapping.revenueColumn,
      revenueShareColumn: mapping.revenueShareColumn,
      rowFilterColumn: mapping.rowFilterColumn,
      rowFilterValue: mapping.rowFilterValue,
      aggregateDailyRows: mapping.aggregateDailyRows,
      preferredSheetName,
    }),
  };
}
