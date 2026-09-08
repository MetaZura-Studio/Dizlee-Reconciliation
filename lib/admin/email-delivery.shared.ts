/**
 * Email delivery log filters, query builders, and list DTOs for Admin UI.
 */

import {
  EMAIL_DELIVERY_PURPOSES,
  EMAIL_DELIVERY_STATUSES,
  type EmailDeliveryStatus,
} from "@/lib/auth/email-delivery.shared";
import { parseDateBoundary } from "@/lib/admin/audit-logs.shared";

export type EmailDeliveryListItem = {
  id: string;
  createdAt: string;
  toEmail: string;
  originalToEmail: string | null;
  fromEmail: string | null;
  subject: string;
  purpose: string;
  status: string;
  skipReason: string | null;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  notificationId: string | null;
  correlationId: string | null;
  actorEmail: string | null;
};

export type EmailDeliverySortField = "createdAt" | "status" | "purpose" | "toEmail";
export type EmailDeliverySortDirection = "asc" | "desc";

export type EmailDeliveryListFilters = {
  search: string;
  status: EmailDeliveryStatus | "all";
  purpose: string;
  dateFrom: string;
  dateTo: string;
  sortBy: EmailDeliverySortField;
  sortDir: EmailDeliverySortDirection;
  page: number;
  pageSize: number;
};

export type EmailDeliveryListResult = {
  items: EmailDeliveryListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: EmailDeliveryListFilters;
};

export type EmailDeliveryFilterOptions = {
  statuses: Array<{ code: string; label: string }>;
  purposes: Array<{ code: string; label: string }>;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 25;

const PURPOSE_LABELS: Record<string, string> = {
  PASSWORD_INVITE: "Password invite",
  PASSWORD_FORGOT: "Password forgot",
  PLATFORM: "Platform",
  ADMIN_TEST: "Admin test",
  NOTIFICATION: "Notification",
  INTIMATION: "Intimation",
  REMINDER: "Reminder",
  EVENT: "Event",
};

const STATUS_LABELS: Record<string, string> = {
  SKIPPED: "Skipped",
  ACCEPTED: "Accepted",
  FAILED: "Failed",
};

export function emailDeliveryPurposeLabel(code: string): string {
  return PURPOSE_LABELS[code] ?? code;
}

export function emailDeliveryStatusLabel(code: string): string {
  return STATUS_LABELS[code] ?? code;
}

export function parseEmailDeliveryListFilters(
  searchParams: URLSearchParams,
): EmailDeliveryListFilters {
  const pageParam = Number(searchParams.get("page") ?? "1");
  const pageSizeParam = Number(
    searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
  );

  const statusParam = searchParams.get("status")?.toUpperCase();
  const status: EmailDeliveryStatus | "all" =
    statusParam &&
    (EMAIL_DELIVERY_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as EmailDeliveryStatus)
      : "all";

  const purposeParam = searchParams.get("purpose")?.trim() ?? "all";
  const purpose =
    purposeParam === "all" || purposeParam === ""
      ? "all"
      : purposeParam.toUpperCase().slice(0, 64);

  const sortByParam = searchParams.get("sortBy");
  const sortBy: EmailDeliverySortField =
    sortByParam === "status" ||
    sortByParam === "purpose" ||
    sortByParam === "toEmail" ||
    sortByParam === "createdAt"
      ? sortByParam
      : "createdAt";
  const sortDir: EmailDeliverySortDirection =
    searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  return {
    search: searchParams.get("search") ?? "",
    status,
    purpose,
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    sortBy,
    sortDir,
    page: Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1,
    pageSize:
      Number.isFinite(pageSizeParam) && pageSizeParam > 0
        ? Math.min(Math.floor(pageSizeParam), MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE,
  };
}

export function buildEmailDeliveryQuery(
  filters: EmailDeliveryListFilters,
): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  });

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.purpose !== "all") {
    params.set("purpose", filters.purpose);
  }
  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  return params.toString();
}

export function getEmailDeliveryFilterOptions(): EmailDeliveryFilterOptions {
  return {
    statuses: EMAIL_DELIVERY_STATUSES.map((code) => ({
      code,
      label: emailDeliveryStatusLabel(code),
    })),
    purposes: EMAIL_DELIVERY_PURPOSES.map((code) => ({
      code,
      label: emailDeliveryPurposeLabel(code),
    })),
  };
}

export { parseDateBoundary };
