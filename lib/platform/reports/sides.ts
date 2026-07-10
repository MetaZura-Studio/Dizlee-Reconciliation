/**
 * OpCo and Partner each upload their own report for the same lane + period.
 * The reports table unique key is (opco_id, partner_id, year, month, version),
 * so we reserve version 1 for OpCo-side reports and version 2 for Partner-side reports.
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
  };
}
