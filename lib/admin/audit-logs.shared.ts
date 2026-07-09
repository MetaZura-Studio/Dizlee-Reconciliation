export type AuditLogActorRole = "ADMIN" | "CLIENT" | "OPCO" | "PARTNER";

export type AuditLogListItem = {
  id: string;
  createdAt: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  actionCode: string;
  actionLabel: string;
  entityTypeCode: string;
  entityTypeLabel: string;
  entityId: string;
  message: string | null;
};

export type AuditLogListFilters = {
  search: string;
  entityType: string;
  actorRole: AuditLogActorRole | "all";
  action: string;
  entityId: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
};

export type AuditLogListResult = {
  items: AuditLogListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: AuditLogListFilters;
};

export type AuditLogFilterOptions = {
  entityTypes: Array<{ code: string; label: string }>;
  actions: Array<{ code: string; label: string }>;
  actorRoles: Array<{ code: AuditLogActorRole; label: string }>;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function parseAuditLogListFilters(
  searchParams: URLSearchParams,
): AuditLogListFilters {
  const pageParam = Number(searchParams.get("page") ?? "1");
  const pageSizeParam = Number(
    searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
  );

  const roleParam = searchParams.get("actorRole")?.toUpperCase();
  const actorRole: AuditLogActorRole | "all" =
    roleParam === "ADMIN" ||
    roleParam === "CLIENT" ||
    roleParam === "OPCO" ||
    roleParam === "PARTNER"
      ? roleParam
      : "all";

  return {
    search: searchParams.get("search") ?? "",
    entityType: searchParams.get("entityType") ?? "all",
    actorRole,
    action: searchParams.get("action") ?? "all",
    entityId: searchParams.get("entityId") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    page: Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1,
    pageSize:
      Number.isFinite(pageSizeParam) && pageSizeParam > 0
        ? Math.min(Math.floor(pageSizeParam), MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE,
  };
}

export function buildAuditLogQuery(filters: AuditLogListFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.entityType !== "all") {
    params.set("entityType", filters.entityType);
  }
  if (filters.actorRole !== "all") {
    params.set("actorRole", filters.actorRole);
  }
  if (filters.action !== "all") {
    params.set("action", filters.action);
  }
  if (filters.entityId.trim()) {
    params.set("entityId", filters.entityId.trim());
  }
  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  return params.toString();
}

export function parseDateBoundary(
  value: string,
  boundary: "start" | "end",
): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (boundary === "end") {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

export function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function buildAuditLogCsv(rows: AuditLogListItem[]): string {
  const header = [
    "Timestamp",
    "Actor name",
    "Actor email",
    "Actor role",
    "Action",
    "Entity type",
    "Entity ID",
    "Message",
  ];

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.createdAt,
        row.actorName,
        row.actorEmail,
        row.actorRole,
        row.actionCode,
        row.entityTypeCode,
        row.entityId,
        row.message ?? "",
      ]
        .map((value) => escapeCsvValue(value))
        .join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}
