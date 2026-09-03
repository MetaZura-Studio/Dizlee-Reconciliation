/**
 * Cross-OpCo view of where the partner must submit for the active period.
 * Highlights submission status per linked OpCo relationship.
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
import { ListPagination } from "@/components/ui/list-pagination";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  OpcoSubmissionStatus,
  OpcoSubmissionSummary,
} from "@/lib/partner/queries/dashboard";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import { submissionStatusTone } from "@/lib/ui/status-tones";

const STATUS_LABELS: Record<OpcoSubmissionStatus, string> = {
  submitted: "Submitted",
  missing: "Not submitted",
  change_requested: "Change requested",
  pending: "Pending",
};

const STATUS_SORT_ORDER: Record<OpcoSubmissionStatus, number> = {
  submitted: 0,
  pending: 1,
  change_requested: 2,
  missing: 3,
};

type SortField = "opco" | "status" | "uploaded";

type OpcoSubmissionsTableProps = {
  opcos: OpcoSubmissionSummary[];
};

export function OpcoSubmissionsTable({ opcos }: OpcoSubmissionsTableProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("opco");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const sorted = useMemo(() => {
    const rows = [...opcos];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "opco":
          cmp = a.opcoName.localeCompare(b.opcoName);
          break;
        case "status":
          cmp = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
          if (cmp === 0) {
            cmp = a.opcoName.localeCompare(b.opcoName);
          }
          break;
        case "uploaded": {
          const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          cmp = aTime - bTime;
          if (cmp === 0) {
            cmp = a.opcoName.localeCompare(b.opcoName);
          }
          break;
        }
        default:
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [opcos, sortBy, sortDir]);

  const paged = useMemo(() => paginateItems(sorted, page), [sorted, page]);

  const applySort = (field: SortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <DataTableFrame>
        <DataTable>
          <DataTableHead>
            <tr>
              <SortableDataTableTh
                label="OpCo"
                active={sortBy === "opco"}
                direction={sortDir}
                onSort={() => applySort("opco")}
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
            {paged.items.map((opco) => (
              <DataTableRow key={opco.opcoId}>
                <DataTableTd className="font-medium text-foreground">
                  {opco.opcoName}
                </DataTableTd>
                <DataTableTd align="center">
                  <StatusPill tone={submissionStatusTone(opco.status)}>
                    {STATUS_LABELS[opco.status]}
                  </StatusPill>
                </DataTableTd>
                <DataTableTd className="text-foreground-muted" align="center">
                  {opco.uploadedAt
                    ? formatAppDateTime(opco.uploadedAt)
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
        noun="OpCo"
        nounPlural="OpCos"
        onPageChange={setPage}
      />
    </div>
  );
}
