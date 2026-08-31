/**
 * Client-safe inbox list URL filter parsing (All / Read / Unread).
 * Keep free of server-only imports so the notifications inbox UI can use it.
 */

export type InboxReadFilter = "all" | "read" | "unread";

export function parseInboxFilters(searchParams: URLSearchParams): {
  page: number;
  readFilter: InboxReadFilter;
  search: string;
} {
  const page = Number(searchParams.get("page"));
  const filterParam = searchParams.get("filter");
  let readFilter: InboxReadFilter = "all";
  if (filterParam === "read" || filterParam === "unread") {
    readFilter = filterParam;
  } else if (searchParams.get("unreadOnly") === "true") {
    readFilter = "unread";
  }

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    readFilter,
    search: (searchParams.get("search") ?? "").trim(),
  };
}
