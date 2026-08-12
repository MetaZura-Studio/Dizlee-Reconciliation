/**
 * Admin OpCo report column mapping DTOs and partner-mode constants.
 */

export const OPCO_PARTNER_MODES = [
  "EXCEL_COLUMN",
  "SERVICE_PARTNER_MAP",
  "UPLOAD_PICKER",
] as const;

export type OpcoPartnerMode = (typeof OPCO_PARTNER_MODES)[number];

export type OpcoAvailableSheet = {
  name: string;
  headerCount: number;
};

export type OpcoReportMappingView = {
  opcoId: string;
  opcoName: string;
  sampleFileName: string | null;
  sampleSheetName: string | null;
  sampleHeaderRowNumber: number | null;
  availableSheets: OpcoAvailableSheet[];
  headers: string[];
  serviceColumn: string | null;
  partnerMode: OpcoPartnerMode;
  partnerColumn: string | null;
  revenueColumn: string | null;
  revenueShareColumn: string | null;
  rowFilterColumn: string | null;
  rowFilterValue: string | null;
  aggregateDailyRows: boolean;
  isConfigured: boolean;
};

export function partnerModeLabel(mode: OpcoPartnerMode): string {
  switch (mode) {
    case "EXCEL_COLUMN":
      return "Excel column";
    case "SERVICE_PARTNER_MAP":
      return "From Service–Partner map";
    case "UPLOAD_PICKER":
      return "Select Partner at upload";
  }
}
