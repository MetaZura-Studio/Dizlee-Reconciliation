"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { UserDeleteModal } from "@/components/admin/user-delete-modal";
import { UserFormModal } from "@/components/admin/user-form-modal";
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

function statusBadgeClass(status: AdminUserStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "INACTIVE":
      return "bg-zinc-100 text-zinc-600 ring-zinc-500/20";
    case "SUSPENDED":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        throw new Error(payload.error ?? "Failed to load users");
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

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = setTimeout(() => setSuccessMessage(null), 4000);
    void loadUsers(currentFilters);
  };

  const toggleSort = (field: UserSortField) => {
    if (sortBy === field) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDir("asc");
  };

  const sortIndicator = (field: UserSortField) => {
    if (sortBy !== field) {
      return "";
    }
    return sortDir === "asc" ? " ↑" : " ↓";
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Create, edit, and manage portal user accounts. Admin accounts are not
            listed here.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Create user
        </button>
      </div>

      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm lg:col-span-2">
            <span className="mb-1 block text-xs text-zinc-500">Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or email"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Role</span>
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as AdminUserRole | "all")
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              <option value="all">All roles</option>
              <option value="client">{formatUserRoleLabel("client")}</option>
              <option value="opco">{formatUserRoleLabel("opco")}</option>
              <option value="partner">{formatUserRoleLabel("partner")}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AdminUserStatus | "all")
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="font-medium hover:text-zinc-800"
                  >
                    Name{sortIndicator("name")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("email")}
                    className="font-medium hover:text-zinc-800"
                  >
                    Email{sortIndicator("email")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("role")}
                    className="font-medium hover:text-zinc-800"
                  >
                    Role{sortIndicator("role")}
                  </button>
                </th>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("status")}
                    className="font-medium hover:text-zinc-800"
                  >
                    Status{sortIndicator("status")}
                  </button>
                </th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Loading users…
                  </td>
                </tr>
              ) : result.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                result.items.map((user) => (
                  <tr key={user.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-900">{user.name}</td>
                    <td className="px-4 py-3 text-zinc-700">{user.email}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {formatUserRoleLabel(user.role)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {user.role === "opco"
                        ? user.opcoName ?? "—"
                        : user.role === "partner"
                          ? user.partnerName ?? "—"
                          : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(user.status)}`}
                      >
                        {formatUserStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatDateTime(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(user)}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
          <p>
            {result.total} user{result.total === 1 ? "" : "s"}
            {loading ? " · refreshing…" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(result.page - 1)}
              disabled={result.page <= 1 || loading}
              className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {result.page} of {result.totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(result.page + 1)}
              disabled={result.page >= result.totalPages || loading}
              className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
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
    </div>
  );
}
