/**
 * Manage platform user accounts: list, filter, invite, edit, and deactivate users.
 * Used by administrators to control access across all portals.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { UserDeleteModal } from "@/components/admin/user-delete-modal";
import { UserFormModal } from "@/components/admin/user-form-modal";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { LoadingOverlay } from "@/components/ui/loading";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import type {
  AdminUserRole,
  AdminUserStatus,
  SortDirection,
  UserListItem,
  UserListResult,
  UserSortField,
} from "@/lib/admin/users.shared";
import {
  formatUserRoleLabel,
  formatUserStatusLabel,
} from "@/lib/admin/users.shared";
import { ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";
import { formatAppError } from "@/lib/errors/format";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildQuery(filters: UserListResult["filters"]): string {
  const params = new URLSearchParams({
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.role !== "all") {
    params.set("role", filters.role);
  }
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  return params.toString();
}

function statusTone(status: AdminUserStatus): "success" | "neutral" | "warning" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "INACTIVE":
      return "neutral";
    case "SUSPENDED":
      return "warning";
  }
}

type UsersViewProps = {
  initialResult: UserListResult;
};

export function UsersView({ initialResult }: UsersViewProps) {
  const [search, setSearch] = useState(initialResult.filters.search);
  const [role, setRole] = useState<AdminUserRole | "all">(initialResult.filters.role);
  const [status, setStatus] = useState<AdminUserStatus | "all">(
    initialResult.filters.status,
  );
  const [sortBy, setSortBy] = useState<UserSortField>(initialResult.filters.sortBy);
  const [sortDir, setSortDir] = useState<SortDirection>(initialResult.filters.sortDir);
  const [page, setPage] = useState(initialResult.page);

  const [result, setResult] = useState<UserListResult>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const currentFilters: UserListResult["filters"] = {
    search,
    role,
    status,
    sortBy,
    sortDir,
    page,
    pageSize: result.pageSize,
  };

  const loadUsers = useCallback(async (filters: UserListResult["filters"]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users?${buildQuery(filters)}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load users"));
      }
      const nextResult = payload.data as UserListResult;
      setResult(nextResult);
      setPage(nextResult.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const skipInitialFetchRef = useRef(true);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setPage(1);
      void loadUsers({
        search,
        role,
        status,
        sortBy,
        sortDir,
        page: 1,
        pageSize: result.pageSize,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, role, status, sortBy, sortDir, result.pageSize, loadUsers]);

  const showSuccess = (message: string) => {
    toast.success(message);
    void loadUsers(currentFilters);
  };

  const toggleSort = (field: UserSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const openCreate = () => {
    setFormMode("create");
    setSelectedUser(null);
    setFormOpen(true);
  };

  const openEdit = (user: UserListItem) => {
    setFormMode("edit");
    setSelectedUser(user);
    setFormOpen(true);
  };

  const openDelete = (user: UserListItem) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    void loadUsers({ ...currentFilters, page: nextPage });
  };

  const clearFilters = () => {
    skipInitialFetchRef.current = true;
    setSearch("");
    setRole("all");
    setStatus("all");
    setSortBy("name");
    setSortDir("asc");
    setPage(1);
    void loadUsers({
      search: "",
      role: "all",
      status: "all",
      sortBy: "name",
      sortDir: "asc",
      page: 1,
      pageSize: result.pageSize,
    });
  };

  return (
    <PageCard>
      <PageHeader
        title="Users"
        description="Create, edit, and manage portal user accounts. Admin accounts are not listed here."
        actions={<Button onClick={openCreate}>Create user</Button>}
      />

      {error ? <p className={ui.alertError}>{error}</p> : null}

      <FilterToolbar className="mt-6">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm lg:col-span-2">
            <span className={ui.label}>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or email"
              className={ui.input}
            />
          </label>
          <label className="text-sm">
            <span className={ui.label}>Role</span>
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as AdminUserRole | "all")
              }
              className={ui.select}
            >
              <option value="all">All roles</option>
              <option value="client">{formatUserRoleLabel("client")}</option>
              <option value="opco">{formatUserRoleLabel("opco")}</option>
              <option value="partner">{formatUserRoleLabel("partner")}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AdminUserStatus | "all")
              }
              className={ui.select}
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
        </div>
        <Button type="button" variant="secondary" onClick={clearFilters}>
          Clear filters
        </Button>
      </FilterToolbar>

      <div className="mt-6 space-y-4">
        <LoadingOverlay active={loading} className="min-h-[12rem]">
        {result.items.length === 0 ? (
          <EmptyState
            title="No users found"
            description="No users match your filters."
          />
        ) : (
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <SortableDataTableTh
                    label="Name"
                    active={sortBy === "name"}
                    direction={sortDir}
                    onSort={() => toggleSort("name")}
                  />
                  <SortableDataTableTh
                    label="Email"
                    active={sortBy === "email"}
                    direction={sortDir}
                    onSort={() => toggleSort("email")}
                  />
                  <SortableDataTableTh
                    label="Role"
                    active={sortBy === "role"}
                    direction={sortDir}
                    onSort={() => toggleSort("role")}
                  />
                  <DataTableTh>Organization</DataTableTh>
                  <SortableDataTableTh
                    label="Status"
                    active={sortBy === "status"}
                    direction={sortDir}
                    onSort={() => toggleSort("status")}
                  />
                  <DataTableTh>Last login</DataTableTh>
                  <DataTableTh align="right">Actions</DataTableTh>
                </tr>
              </DataTableHead>
              <tbody>
                {result.items.map((user) => (
                  <DataTableRow key={user.id}>
                    <DataTableTd className="font-medium text-foreground">
                      {user.name}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {user.email}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {formatUserRoleLabel(user.role)}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {user.role === "opco"
                        ? user.opcoName ?? "—"
                        : user.role === "partner"
                          ? user.partnerName ?? "—"
                          : "—"}
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={statusTone(user.status)}>
                        {formatUserStatusLabel(user.status)}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {formatDateTime(user.lastLoginAt)}
                    </DataTableTd>
                    <DataTableTd align="right">
                      <div className="flex justify-end gap-2">
                        <IconButton label="Edit user" onClick={() => openEdit(user)}>
                          <IconPencil />
                        </IconButton>
                        <IconButton
                          label="Delete user"
                          variant="danger"
                          onClick={() => openDelete(user)}
                        >
                          <IconTrash />
                        </IconButton>
                      </div>
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>
        )}

        </LoadingOverlay>

        <div className="flex items-center justify-between text-sm text-foreground-muted">
          <p>
            {result.total} user{result.total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => goToPage(result.page - 1)}
              disabled={result.page <= 1 || loading}
            >
              Previous
            </Button>
            <span>
              Page {result.page} of {result.totalPages}
            </span>
            <Button
              variant="secondary"
              onClick={() => goToPage(result.page + 1)}
              disabled={result.page >= result.totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <UserFormModal
        open={formOpen}
        mode={formMode}
        user={selectedUser}
        onClose={() => setFormOpen(false)}
        onSaved={showSuccess}
      />

      <UserDeleteModal
        open={deleteOpen}
        user={selectedUser}
        onClose={() => setDeleteOpen(false)}
        onDeleted={showSuccess}
      />
    </PageCard>
  );
}
