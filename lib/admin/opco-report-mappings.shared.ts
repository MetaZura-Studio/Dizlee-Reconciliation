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

/** One equals row filter on an OpCo Excel column. */
export type OpcoRowFilter = {
  column: string;
  value: string;
};

export const MAX_OPCO_ROW_FILTERS = 10;

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
  /** Source of truth for row filters (AND). */
  rowFilters: OpcoRowFilter[];
  /** First filter column — kept for legacy readers / display. */
  rowFilterColumn: string | null;
  /** First filter value — kept for legacy readers / display. */
  rowFilterValue: string | null;
  aggregateDailyRows: boolean;
  isConfigured: boolean;
};

function trimFilterField(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normalize a filter list; drop incomplete items; cap at MAX_OPCO_ROW_FILTERS. */
export function normalizeOpcoRowFilters(
  filters: Array<{ column?: unknown; value?: unknown }> | null | undefined,
): OpcoRowFilter[] {
  if (!Array.isArray(filters)) {
    return [];
  }
  const normalized: OpcoRowFilter[] = [];
  for (const item of filters) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const column = trimFilterField(item.column);
    const value = trimFilterField(item.value);
    if (!column || !value) {
      continue;
    }
    normalized.push({ column, value });
    if (normalized.length >= MAX_OPCO_ROW_FILTERS) {
      break;
    }
  }
  return normalized;
}

/** Prefer JSON list; fall back to legacy scalar pair. */
export function resolveOpcoRowFilters(params: {
  rowFiltersJson?: string | null;
  rowFilterColumn?: string | null;
  rowFilterValue?: string | null;
}): OpcoRowFilter[] {
  const fromJson = (() => {
    const raw = params.rowFiltersJson?.trim();
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return null;
      }
      return normalizeOpcoRowFilters(
        parsed as Array<{ column?: unknown; value?: unknown }>,
      );
    } catch {
      return null;
    }
  })();

  if (fromJson && fromJson.length > 0) {
    return fromJson;
  }

  const column = trimFilterField(params.rowFilterColumn);
  const value = trimFilterField(params.rowFilterValue);
  if (column && value) {
    return [{ column, value }];
  }
  return [];
}

export function serializeOpcoRowFiltersJson(
  filters: OpcoRowFilter[],
): string | null {
  const normalized = normalizeOpcoRowFilters(filters);
  if (normalized.length === 0) {
    return null;
  }
  return JSON.stringify(normalized);
}

export function legacyRowFilterPair(filters: OpcoRowFilter[]): {
  rowFilterColumn: string | null;
  rowFilterValue: string | null;
} {
  const first = filters[0];
  if (!first) {
    return { rowFilterColumn: null, rowFilterValue: null };
  }
  return {
    rowFilterColumn: first.column,
    rowFilterValue: first.value,
  };
}

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

export function isPartnerMode(value: string): value is OpcoPartnerMode {
  return (OPCO_PARTNER_MODES as readonly string[]).includes(value);
}

/**
 * Same readiness Admin uses for a configured Report map.
 * Upload/parse must use this before accepting OpCo monthly files.
 */
export function isOpcoReportMappingConfigured(params: {
  sampleSheetName: string | null | undefined;
  serviceColumn: string | null | undefined;
  revenueColumn: string | null | undefined;
  revenueShareColumn: string | null | undefined;
  partnerMode: string;
  partnerColumn: string | null | undefined;
}): boolean {
  const partnerMode = isPartnerMode(params.partnerMode)
    ? params.partnerMode
    : "EXCEL_COLUMN";
  return Boolean(
    params.sampleSheetName?.trim() &&
      params.serviceColumn?.trim() &&
      params.revenueColumn?.trim() &&
      params.revenueShareColumn?.trim() &&
      (partnerMode !== "EXCEL_COLUMN" || params.partnerColumn?.trim()),
  );
}
