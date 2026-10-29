/**
 * Shared DTOs for Dizlee Partner invoice-upload access (no server-only imports).
 */

export const PARTNER_INVOICE_ACCESS_PAGE_SIZE = 10;

export type PartnerInvoiceAccessStatusFilter = "all" | "open" | "closed";

export type PartnerInvoiceAccessSortField = "name" | "updatedAt";

export type PartnerInvoiceAccessSortDir = "asc" | "desc";

export type PartnerInvoiceAccessItem = {
  id: string;
  name: string;
  invoiceUploadEnabled: boolean;
  updatedAt: string;
  updatedAtLabel: string;
};

export type PartnerInvoiceAccessFilters = {
  search?: string;
  status: PartnerInvoiceAccessStatusFilter;
  sortBy: PartnerInvoiceAccessSortField;
  sortDir: PartnerInvoiceAccessSortDir;
  page: number;
};

export type PartnerInvoiceAccessResult = {
  items: PartnerInvoiceAccessItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: PartnerInvoiceAccessFilters;
};

export type BulkPartnerInvoiceAccessResult = {
  enabled: boolean;
  updatedCount: number;
  notifiedCount: number;
};

const STATUS_VALUES = new Set<PartnerInvoiceAccessStatusFilter>([
  "all",
  "open",
  "closed",
]);

const SORT_FIELDS = new Set<PartnerInvoiceAccessSortField>([
  "name",
  "updatedAt",
]);

const SORT_DIRS = new Set<PartnerInvoiceAccessSortDir>(["asc", "desc"]);

export function parsePartnerInvoiceAccessFilters(
  params: URLSearchParams | { get(name: string): string | null },
): PartnerInvoiceAccessFilters {
  const search = params.get("search")?.trim() || undefined;
  const statusRaw = params.get("status")?.trim().toLowerCase();
  const status: PartnerInvoiceAccessStatusFilter =
    statusRaw && STATUS_VALUES.has(statusRaw as PartnerInvoiceAccessStatusFilter)
      ? (statusRaw as PartnerInvoiceAccessStatusFilter)
      : "all";
  const sortByRaw = params.get("sortBy")?.trim();
  const sortBy: PartnerInvoiceAccessSortField =
    sortByRaw && SORT_FIELDS.has(sortByRaw as PartnerInvoiceAccessSortField)
      ? (sortByRaw as PartnerInvoiceAccessSortField)
      : "name";
  const sortDirRaw = params.get("sortDir")?.trim().toLowerCase();
  const sortDir: PartnerInvoiceAccessSortDir =
    sortDirRaw && SORT_DIRS.has(sortDirRaw as PartnerInvoiceAccessSortDir)
      ? (sortDirRaw as PartnerInvoiceAccessSortDir)
      : sortBy === "updatedAt"
        ? "desc"
        : "asc";
  const pageRaw = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  return { search, status, sortBy, sortDir, page };
}
