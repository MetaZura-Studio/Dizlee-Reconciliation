/**
 * Table of partner report submissions visible to the OpCo for a period.
 * Lets OpCo users monitor partner compliance alongside their own files.
 */

"use client";

import { useMemo, useState } from "react";

import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterActions } from "@/components/ui/filter-actions";
import { ListPagination } from "@/components/ui/list-pagination";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  PartnerSubmissionStatus,
  PartnerSubmissionSummary,
} from "@/lib/opco/queries/dashboard";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { paginateItems } from "@/lib/ui/list-pagination";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import { submissionStatusTone } from "@/lib/ui/status-tones";

const STATUS_LABELS: Record<PartnerSubmissionStatus, string> = {
  submitted: "Submitted",
  missing: "Not submitted",
  change_requested: "Change requested",
  pending: "Pending",
};

const STATUS_SORT_ORDER: Record<PartnerSubmissionStatus, number> = {
  submitted: 0,
  pending: 1,
  change_requested: 2,
  missing: 3,
};

type SortField = "partner" | "status" | "uploaded";
type StatusFilter = PartnerSubmissionStatus | "all";

type PartnerSubmissionsTableProps = {
  partners: PartnerSubmissionSummary[];
};

export function PartnerSubmissionsTable({ partners }: PartnerSubmissionsTableProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("partner");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return partners.filter((partner) => {
      if (statusFilter !== "all" && partner.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return partner.partnerName.toLowerCase().includes(query);
    });
  }, [partners, search, statusFilter]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "partner":
          cmp = a.partnerName.localeCompare(b.partnerName);
          break;
        case "status":
          cmp = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
          if (cmp === 0) {
            cmp = a.partnerName.localeCompare(b.partnerName);
          }
          break;
        case "uploaded": {
          const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          cmp = aTime - bTime;
          if (cmp === 0) {
            cmp = a.partnerName.localeCompare(b.partnerName);
          }
          break;
        }
        default:
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filtered, sortBy, sortDir]);

  const paged = useMemo(() => paginateItems(sorted, page), [sorted, page]);

  const applySort = (field: SortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const filtersActive = search.trim() !== "" || statusFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm lg:col-span-1">
          <span className={ui.label}>Partner</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Partner name"
            className={ui.input}
          />
        </label>
        <label className="text-sm">
          <span className={ui.label}>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
            className={ui.select}
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="missing">Not submitted</option>
            <option value="change_requested">Change requested</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <FilterActions
          className="items-end sm:col-span-2 lg:col-span-1"
          clearLabel="Clear filters"
          disabled={!filtersActive}
          onClear={clearFilters}
        />
      </div>

      {paged.total === 0 ? (
        <EmptyState
          title={filtersActive ? "No partners match filters" : "No partners"}
          description={
            filtersActive
              ? "Try another name or status, or clear filters."
              : "No partners are linked to this OpCo yet."
          }
        />
      ) : (
        <>
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <SortableDataTableTh
                    label="Partner"
                    active={sortBy === "partner"}
                    direction={sortDir}
                    onSort={() => applySort("partner")}
                  />
                  <SortableDataTableTh
                    label="Status"
                    active={sortBy === "status"}
                    direction={sortDir}
                    onSort={() => applySort("status")}
                    align="center"
                  />
                  <SortableDataTableTh
                    label="Last upload"
                    active={sortBy === "uploaded"}
                    direction={sortDir}
                    onSort={() => applySort("uploaded")}
                    align="center"
                  />
                </tr>
              </DataTableHead>
              <tbody>
                {paged.items.map((partner) => (
                  <DataTableRow key={partner.partnerId}>
                    <DataTableTd className="font-medium text-foreground">
                      {partner.partnerName}
                    </DataTableTd>
                    <DataTableTd align="center">
                      <StatusPill tone={submissionStatusTone(partner.status)}>
                        {STATUS_LABELS[partner.status]}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted" align="center">
                      {partner.uploadedAt
                        ? formatAppDateTime(partner.uploadedAt)
                        : "—"}
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
            noun="partner"
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
