/**
 * Default OpCo report column mappings (Appendix A) for seed / fresh DBs.
 */

import { serializeSampleHeaders } from "../../lib/admin/opco-report-mapping-excel";

export type OpcoReportMappingSeed = {
  opcoSlug: string;
  partnerMode: "EXCEL_COLUMN" | "SERVICE_PARTNER_MAP" | "UPLOAD_PICKER";
  partnerColumn: string | null;
  serviceColumn: string | null;
  revenueColumn: string | null;
  revenueShareColumn: string | null;
  rowFilterColumn: string | null;
  rowFilterValue: string | null;
  aggregateDailyRows: boolean;
  sheetName: string | null;
  headers: string[] | null;
};

function headersJsonFor(
  headers: string[] | null,
  sheetName: string | null,
): string | null {
  if (!headers?.length || !sheetName) {
    return null;
  }
  const selected = {
    headers,
    sheetName,
    headerRowNumber: 1,
  };
  return serializeSampleHeaders(selected, [selected]);
}

export const OPCO_REPORT_MAPPING_SEEDS: OpcoReportMappingSeed[] = [
  {
    opcoSlug: "zain-bahrain",
    partnerMode: "EXCEL_COLUMN",
    partnerColumn: "Merchant Name",
    serviceColumn: "Service Name",
    revenueColumn: "Total Gross Revenue",
    revenueShareColumn: null,
    rowFilterColumn: "Aggregator Name",
    rowFilterValue: "Group API",
    aggregateDailyRows: false,
    sheetName: "Report",
    headers: [
      "Aggregator Name",
      "Merchant Name",
      "Service Name",
      "Total Gross Revenue",
    ],
  },
  {
    opcoSlug: "zain-jordan",
    partnerMode: "EXCEL_COLUMN",
    partnerColumn: "Merchant Name",
    serviceColumn: "Service Name",
    revenueColumn: "Total Gross Revenue",
    revenueShareColumn: null,
    rowFilterColumn: null,
    rowFilterValue: null,
    aggregateDailyRows: false,
    sheetName: "Report",
    headers: ["Merchant Name", "Service Name", "Total Gross Revenue"],
  },
  {
    opcoSlug: "zain-ksa",
    partnerMode: "EXCEL_COLUMN",
    partnerColumn: "VENDORNAME",
    serviceColumn: "SERVICENAME",
    revenueColumn: "ORIGINALAMOUNT",
    revenueShareColumn: null,
    rowFilterColumn: null,
    rowFilterValue: null,
    aggregateDailyRows: false,
    sheetName: "Report",
    headers: ["VENDORNAME", "SERVICENAME", "ORIGINALAMOUNT"],
  },
  {
    opcoSlug: "zain-kuwait",
    partnerMode: "EXCEL_COLUMN",
    partnerColumn: "Service provider Name",
    serviceColumn: "Service name",
    revenueColumn: "Gross Revenue (LC)",
    revenueShareColumn: "RS %",
    rowFilterColumn: null,
    rowFilterValue: null,
    aggregateDailyRows: false,
    sheetName: "Dizlee Rev 3% - Detailed",
    headers: [
      "Service provider Name",
      "Service name",
      "Gross Revenue (LC)",
      "RS %",
    ],
  },
  {
    opcoSlug: "zain-iraq",
    partnerMode: "SERVICE_PARTNER_MAP",
    partnerColumn: null,
    serviceColumn: "APPLICATIONNAME",
    revenueColumn: "SERVICE_REVENUE/IQD",
    revenueShareColumn: null,
    rowFilterColumn: null,
    rowFilterValue: null,
    aggregateDailyRows: false,
    sheetName: "Report",
    headers: ["APPLICATIONNAME", "SERVICE_REVENUE/IQD"],
  },
  {
    opcoSlug: "zain-sudan",
    partnerMode: "SERVICE_PARTNER_MAP",
    partnerColumn: null,
    serviceColumn: "Service",
    revenueColumn: "Revenue",
    revenueShareColumn: null,
    rowFilterColumn: null,
    rowFilterValue: null,
    aggregateDailyRows: true,
    sheetName: "Report",
    headers: ["Date", "Service", "Product", "Revenue"],
  },
  {
    opcoSlug: "zain-south-sudan",
    partnerMode: "EXCEL_COLUMN",
    partnerColumn: "Partner Name",
    serviceColumn: "Service Name",
    revenueColumn: "Gross Revenue",
    revenueShareColumn: null,
    rowFilterColumn: null,
    rowFilterValue: null,
    aggregateDailyRows: false,
    sheetName: "Report",
    headers: ["Partner Name", "Service Name", "Gross Revenue"],
  },
];

export function seedOpcoReportMappingHeadersJson(
  mapping: OpcoReportMappingSeed,
): string | null {
  return headersJsonFor(mapping.headers, mapping.sheetName);
}
