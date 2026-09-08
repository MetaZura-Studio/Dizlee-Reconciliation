/**
 * Session-scoped Compare Report filters for restore after
 * Compare → result → History → Compare (not for fresh sidebar visits).
 */

import type { CompareLaneFilters } from "@/lib/dizlee/reconciliation";

const STORAGE_KEY = "dizlee.reconciliation.compareFiltersRestore";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function isValidFilters(value: unknown): value is CompareLaneFilters {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.month === "number" &&
    typeof row.year === "number" &&
    (row.searchBy === "opco" || row.searchBy === "partner") &&
    typeof row.status === "string" &&
    typeof row.sortBy === "string" &&
    (row.sortDir === "asc" || row.sortDir === "desc")
  );
}

export function saveCompareFiltersForRestore(filters: CompareLaneFilters): void {
  if (!isBrowser()) {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Read and clear pending Compare filters. */
export function consumeCompareFiltersRestore(): CompareLaneFilters | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isValidFilters(parsed) ? parsed : null;
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

/** Drop pending restore without applying (fresh Compare / sidebar entry). */
export function discardCompareFiltersRestore(): void {
  if (!isBrowser()) {
    return;
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
