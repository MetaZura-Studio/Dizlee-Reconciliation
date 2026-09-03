/**
 * OpCo dashboard recent uploads — sortable columns and client pagination.
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
import { ListPagination } from "@/components/ui/list-pagination";
import { StatusPill } from "@/components/ui/status-pill";
import type { RecentUploadSummary } from "@/lib/opco/queries/dashboard";
import { formatPeriodLabel } from "@/lib/opco/period";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type UploadSortField = "partner" | "period" | "status" | "uploadedAt";

type DashboardRecentUploadsProps = {
  items: RecentUploadSummary[];
};

function compareUploads(
  a: RecentUploadSummary,
  b: RecentUploadSummary,
  sortBy: UploadSortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "partner":
      return a.partnerName.localeCompare(b.partnerName) * dir;
    case "period": {
      const aPeriod = a.year * 12 + a.month;
      const bPeriod = b.year * 12 + b.month;
      return (
        (aPeriod - bPeriod || a.partnerName.localeCompare(b.partnerName)) * dir
      );
    }
    case "status":
      return (
        (a.statusLabel.localeCompare(b.statusLabel) ||
          a.partnerName.localeCompare(b.partnerName)) *
        dir
      );
    case "uploadedAt":
    default:
      return (
        (a.uploadedAt.localeCompare(b.uploadedAt) ||
          a.reportId.localeCompare(b.reportId)) *
        dir
      );
  }
}

export function DashboardRecentUploads({ items }: DashboardRecentUploadsProps) {
  const [sortBy, setSortBy] = useState<UploadSortField>("uploadedAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () => [...items].sort((a, b) => compareUploads(a, b, sortBy, sortDir)),
    [items, sortBy, sortDir],
  );

  const paged = useMemo(() => paginateItems(sorted, page), [sorted, page]);

  const applySort = (field: UploadSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="No uploads yet"
        description="No reports uploaded yet for this OpCo."
      />
    );
  }

  return (
    <div className="space-y-4">
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
                label="Period"
                active={sortBy === "period"}
                direction={sortDir}
                onSort={() => applySort("period")}
                align="center"
              />
              <SortableDataTableTh
                label="Status"
                active={sortBy === "status"}
                direction={sortDir}
                onSort={() => applySort("status")}
                align="center"
              />
              <SortableDataTableTh
                label="Uploaded"
                active={sortBy === "uploadedAt"}
                direction={sortDir}
                onSort={() => applySort("uploadedAt")}
                align="center"
              />
            </tr>
          </DataTableHead>
          <tbody>
            {paged.items.map((upload) => (
              <DataTableRow key={upload.reportId}>
                <DataTableTd className="font-medium text-foreground">
                  {upload.partnerName}
                </DataTableTd>
                <DataTableTd className="text-foreground-muted" align="center">
                  {formatPeriodLabel(upload.year, upload.month)}
                </DataTableTd>
                <DataTableTd align="center">
                  <StatusPill tone="neutral">{upload.statusLabel}</StatusPill>
                </DataTableTd>
                <DataTableTd className="text-foreground-muted" align="center">
                  {formatAppDateTime(upload.uploadedAt)}
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
        noun="upload"
        onPageChange={setPage}
      />
    </div>
  );
}
