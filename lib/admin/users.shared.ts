export type AdminUserRole = "client" | "opco" | "partner";
export type AdminUserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type UserSortField = "name" | "email" | "role" | "status";
export type SortDirection = "asc" | "desc";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  opcoId: string | null;
  opcoName: string | null;
  partnerId: string | null;
  partnerName: string | null;
  lastLoginAt: string | null;
};

export type UserFormOptions = {
  opcos: Array<{ id: string; name: string }>;
  partners: Array<{ id: string; name: string }>;
};

export type UserListFilters = {
  search: string;
  role: AdminUserRole | "all";
  status: AdminUserStatus | "all";
  sortBy: UserSortField;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

export type UserListResult = {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: UserListFilters;
};

const DEFAULT_PAGE_SIZE = 20;

export function parseUserListFilters(
  searchParams: URLSearchParams,
): UserListFilters {
  const roleParam = searchParams.get("role");
  const statusParam = searchParams.get("status");
  const sortByParam = searchParams.get("sortBy");
  const sortDirParam = searchParams.get("sortDir");
  const pageParam = Number(searchParams.get("page") ?? "1");
  const pageSizeParam = Number(
    searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
  );

  const role: AdminUserRole | "all" =
    roleParam === "client" || roleParam === "opco" || roleParam === "partner"
      ? roleParam
      : "all";

  const status: AdminUserStatus | "all" =
    statusParam === "ACTIVE" ||
    statusParam === "INACTIVE" ||
    statusParam === "SUSPENDED"
      ? statusParam
      : "all";

  const sortBy: UserSortField =
    sortByParam === "email" ||
    sortByParam === "role" ||
    sortByParam === "status"
      ? sortByParam
      : "name";

  const sortDir: SortDirection = sortDirParam === "desc" ? "desc" : "asc";

  return {
    search: searchParams.get("search") ?? "",
    role,
    status,
    sortBy,
    sortDir,
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    pageSize:
      Number.isFinite(pageSizeParam) && pageSizeParam > 0
        ? Math.min(pageSizeParam, 100)
        : DEFAULT_PAGE_SIZE,
  };
}

export function formatUserRoleLabel(role: AdminUserRole): string {
  switch (role) {
    case "client":
      return "Dizlee";
    case "opco":
      return "OpCo";
    case "partner":
      return "Partner";
  }
}

export function formatUserStatusLabel(status: AdminUserStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "SUSPENDED":
      return "Suspended";
  }
}
