/**
 * Dashboard recent audit activity — client filters, sortable columns, and pagination.
 */

"use client";

import { useMemo, useState } from "react";

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
import { FilterActions } from "@/components/ui/filter-actions";
import { ListPagination } from "@/components/ui/list-pagination";
import { FilterToolbar } from "@/components/ui/page";
import type { AuditLogListItem } from "@/lib/admin/audit-logs.shared";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { paginateItems } from "@/lib/ui/list-pagination";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type ActivitySortField = "createdAt" | "actor" | "action" | "entityType";

type DashboardRecentActivityProps = {
  items: AuditLogListItem[];
};

function formatRoleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function compareActivity(
  a: AuditLogListItem,
  b: AuditLogListItem,
  sortBy: ActivitySortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "actor":
      return (
        (a.actorName.localeCompare(b.actorName) ||
          a.actorEmail.localeCompare(b.actorEmail)) * dir
      );
    case "action":
      return a.actionLabel.localeCompare(b.actionLabel) * dir;
    case "entityType":
      return a.entityTypeLabel.localeCompare(b.entityTypeLabel) * dir;
    case "createdAt":
    default:
      return (a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) * dir;
  }
}

export function DashboardRecentActivity({ items }: DashboardRecentActivityProps) {
  const [actorRole, setActorRole] = useState("all");
  const [action, setAction] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [sortBy, setSortBy] = useState<ActivitySortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const roleOptions = useMemo(() => {
    const codes = new Map<string, string>();
    for (const item of items) {
      if (!codes.has(item.actorRole)) {
        codes.set(item.actorRole, formatRoleLabel(item.actorRole));
      }
    }
    return [...codes.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const actionOptions = useMemo(() => {
    const codes = new Map<string, string>();
    for (const item of items) {
      if (!codes.has(item.actionCode)) {
        codes.set(item.actionCode, item.actionLabel);
      }
    }
    return [...codes.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const entityOptions = useMemo(() => {
    const codes = new Map<string, string>();
    for (const item of items) {
      if (!codes.has(item.entityTypeCode)) {
        codes.set(item.entityTypeCode, item.entityTypeLabel);
      }
    }
    return [...codes.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (actorRole !== "all" && item.actorRole !== actorRole) {
          return false;
        }
        if (action !== "all" && item.actionCode !== action) {
          return false;
        }
        if (entityType !== "all" && item.entityTypeCode !== entityType) {
          return false;
        }
        return true;
      })
      .sort((a, b) => compareActivity(a, b, sortBy, sortDir));
  }, [items, actorRole, action, entityType, sortBy, sortDir]);

  const paged = useMemo(() => paginateItems(filtered, page), [filtered, page]);

  const applySort = (field: ActivitySortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  };

  const clearFilters = () => {
    setActorRole("all");
    setAction("all");
    setEntityType("all");
    setSortBy("createdAt");
    setSortDir("desc");
    setPage(1);
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Admin actions and configuration changes will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterToolbar>
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className={ui.label}>Actor role</span>
            <select
              value={actorRole}
              onChange={(event) => {
                setActorRole(event.target.value);
                setPage(1);
              }}
              className={ui.select}
            >
              <option value="all">All roles</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Action</span>
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
              className={ui.select}
            >
              <option value="all">All actions</option>
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Entity</span>
            <select
              value={entityType}
              onChange={(event) => {
                setEntityType(event.target.value);
                setPage(1);
              }}
              className={ui.select}
            >
              <option value="all">All entities</option>
              {entityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FilterActions onClear={clearFilters} />
      </FilterToolbar>

      {filtered.length === 0 ? (
        <EmptyState
          title="No activity found"
          description="No audit events match your filters."
        />
      ) : (
        <>
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <SortableDataTableTh
                    label="When"
                    active={sortBy === "createdAt"}
                    direction={sortDir}
                    onSort={() => applySort("createdAt")}
                    align="center"
                  />
                  <SortableDataTableTh
                    label="Actor"
                    active={sortBy === "actor"}
                    direction={sortDir}
                    onSort={() => applySort("actor")}
                  />
                  <SortableDataTableTh
                    label="Action"
                    active={sortBy === "action"}
                    direction={sortDir}
                    onSort={() => applySort("action")}
                  />
                  <SortableDataTableTh
                    label="Entity"
                    active={sortBy === "entityType"}
                    direction={sortDir}
                    onSort={() => applySort("entityType")}
                  />
                  <DataTableTh>Details</DataTableTh>
                </tr>
              </DataTableHead>
              <tbody>
                {paged.items.map((entry) => (
                  <DataTableRow key={entry.id}>
                    <DataTableTd
                      className="whitespace-nowrap text-foreground-muted"
                      align="center"
                    >
                      {formatAppDateTime(entry.createdAt)}
                    </DataTableTd>
                    <DataTableTd>
                      <p className="font-medium text-foreground">{entry.actorName}</p>
                      <p className="text-xs text-foreground-subtle">
                        {formatRoleLabel(entry.actorRole)} · {entry.actorEmail}
                      </p>
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {entry.actionLabel}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {entry.entityTypeLabel}
                    </DataTableTd>
                    <DataTableTd className="max-w-xs truncate text-foreground-muted">
                      {entry.message?.trim() || "—"}
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>

          <ListPagination
            total={paged.total}
            page={paged.page}
            totalPages={paged.totalPages}
            noun="event"
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
