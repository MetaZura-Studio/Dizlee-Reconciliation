/**
 * Client-safe outbox list URL filter parsing (All / Intimation / Reminder / Other).
 * Keep free of server-only imports so the communications outbox UI can use it.
 */

export type OutboxKindFilter = "all" | "intimation" | "reminder" | "other";

export type OutboxKind = Exclude<OutboxKindFilter, "all">;

const INTIMATION_PRIORITIES = new Set([
  "",
  "NORMAL",
  "INTIMATION",
  "HIGH",
  "LOW",
]);

/** Classify a sent notification from its stored priority field. */
export function classifyOutboxKind(priority: string | null): OutboxKind {
  const normalized = priority?.trim().toUpperCase() ?? "";
  if (normalized === "REMINDER") {
    return "reminder";
  }
  if (INTIMATION_PRIORITIES.has(normalized)) {
    return "intimation";
  }
  return "other";
}

export function parseOutboxFilters(searchParams: URLSearchParams): {
  page: number;
  kind: OutboxKindFilter;
} {
  const page = Number(searchParams.get("page"));
  const filterParam = searchParams.get("filter");
  let kind: OutboxKindFilter = "all";
  if (
    filterParam === "intimation" ||
    filterParam === "reminder" ||
    filterParam === "other"
  ) {
    kind = filterParam;
  }

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    kind,
  };
}

export function outboxKindLabel(kind: OutboxKind): string {
  if (kind === "reminder") {
    return "Reminder";
  }
  if (kind === "intimation") {
    return "Intimation";
  }
  return "Other";
}
