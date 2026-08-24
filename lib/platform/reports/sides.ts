/**
 * Report upload side versioning — OpCo report version 1, Partner version 2 per lane and period.
 * Aligns with reports unique key (opco_id, partner_id, year, month, version).
 */
export const OPCO_REPORT_VERSION = 1;
export const PARTNER_REPORT_VERSION = 2;

export type ReportUploaderSide = "opco" | "partner";

export function reportVersionForSide(side: ReportUploaderSide): number {
  return side === "opco" ? OPCO_REPORT_VERSION : PARTNER_REPORT_VERSION;
}

export function laneReportWhere(
  side: ReportUploaderSide,
  params: {
    opcoId: bigint;
    partnerId: bigint;
    year: number;
    month: number;
  },
) {
  return {
    opcoId: params.opcoId,
    partnerId: params.partnerId,
    year: params.year,
    month: params.month,
    version: reportVersionForSide(side),
    isDeleted: false,
  };
}
