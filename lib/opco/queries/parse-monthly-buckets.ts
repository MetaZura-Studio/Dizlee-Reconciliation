/**
 * Shared OpCo monthly Excel → partner buckets (upload + submission reupload).
 */

import "server-only";

import {
  assertOpcoMappingReady,
  parseOpcoReportWithMapping,
} from "@/lib/opco/excel/parse-mapped-opco-report";
import type { ParsedReportLine } from "@/lib/opco/excel/parse-report";
import { getOpcoReportMappingByOpcoId } from "@/lib/admin/opco-report-mappings";
import { parseStoredSampleHeaders } from "@/lib/admin/opco-report-mapping-excel";
import {
  resolvePartnerColumnLinesToBuckets,
  PartnerColumnResolveError,
} from "@/lib/opco/queries/resolve-partner-column-lines";
import {
  resolveLookupLinesToPartnerBuckets,
  ServicePartnerResolveError,
} from "@/lib/opco/queries/resolve-service-partner-maps";
import { findUnlinkedPartnersInOpcoFile } from "@/lib/opco/queries/unlinked-partners-in-file";
import { hasUnlinkedPartnersInFile } from "@/lib/opco/unlinked-partners-in-file.shared";
import { DomainError } from "@/lib/errors/app-error";

export class OpcoMonthlyParseError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("OpcoMonthlyParseError", keyOrMessage, status);
  }
}

export class OpcoUnlinkedPartnersError extends DomainError {
  unmatched: unknown;

  constructor(unmatched: unknown) {
    super("OpcoUnlinkedPartnersError", "OPCO_UNLINKED_PARTNERS_IN_FILE", 400);
    this.unmatched = unmatched;
  }
}

export type OpcoPartnerBucket = {
  partnerId: bigint;
  lineItems: ParsedReportLine[];
};

/**
 * Parse OpCo monthly workbook and resolve partner buckets.
 * Rejects UPLOAD_PICKER — monthly multi-partner file only.
 */
export async function parseOpcoMonthlyPartnerBuckets(params: {
  opcoId: bigint;
  buffer: Buffer;
}): Promise<{ buckets: OpcoPartnerBucket[]; preferredSheetName: string | null }> {
  const mappingRow = await getOpcoReportMappingByOpcoId(params.opcoId);
  if (!mappingRow) {
    throw new OpcoMonthlyParseError(
      "OpCo report column mapping is not configured. Ask an admin to set it under OpCos → Report map.",
      400,
    );
  }

  if (mappingRow.partnerMode === "UPLOAD_PICKER") {
    throw new OpcoMonthlyParseError(
      "OpCo uploads must be one monthly Excel with all partners. Update the OpCo report map to Excel Partner column or Service–Partner map.",
      400,
    );
  }

  const preferredSheetName = parseStoredSampleHeaders(
    mappingRow.headersJson,
  ).sheetName;

  const mapping = assertOpcoMappingReady({
    serviceColumn: mappingRow.serviceColumn,
    partnerMode: mappingRow.partnerMode,
    partnerColumn: mappingRow.partnerColumn,
    revenueColumn: mappingRow.revenueColumn,
    revenueShareColumn: mappingRow.revenueShareColumn,
    rowFilterColumn: mappingRow.rowFilterColumn,
    rowFilterValue: mappingRow.rowFilterValue,
    aggregateDailyRows: mappingRow.aggregateDailyRows,
    preferredSheetName,
  });

  const parsed = await parseOpcoReportWithMapping(params.buffer, mapping);
  const unmatched = await findUnlinkedPartnersInOpcoFile({
    opcoId: params.opcoId,
    partnerMode: mapping.partnerMode,
    partnerColumnLines: parsed.partnerColumnLines,
    serviceMapLines: parsed.serviceMapLines,
  });
  if (hasUnlinkedPartnersInFile(unmatched)) {
    throw new OpcoUnlinkedPartnersError(unmatched);
  }

  try {
    const buckets =
      mapping.partnerMode === "EXCEL_COLUMN"
        ? await resolvePartnerColumnLinesToBuckets({
            opcoId: params.opcoId,
            lines: parsed.partnerColumnLines,
          })
        : await resolveLookupLinesToPartnerBuckets({
            opcoId: params.opcoId,
            lines: parsed.serviceMapLines,
          });

    return { buckets, preferredSheetName };
  } catch (error) {
    if (
      error instanceof ServicePartnerResolveError ||
      error instanceof PartnerColumnResolveError
    ) {
      throw new OpcoMonthlyParseError(error.message, error.status);
    }
    throw error;
  }
}
