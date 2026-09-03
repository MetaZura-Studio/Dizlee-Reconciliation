/**
 * Dizlee dashboard upload activity — sortable columns and client pagination.
 */

"use client";

import Link from "next/link";
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
import type { RecentUpload } from "@/lib/dizlee/dashboard";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type UploadSortField = "actorRole" | "lane" | "uploadedAt";

type DashboardUploadActivityProps = {
  items: RecentUpload[];
  reportHref: (reportId: string) => string;
};

function compareUploads(
  a: RecentUpload,
  b: RecentUpload,
  sortBy: UploadSortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "actorRole":
      return a.actorRole.localeCompare(b.actorRole) * dir;
    case "lane":
      return a.lane.localeCompare(b.lane) * dir;
    case "uploadedAt":
    default:
      return (
        (a.uploadedAt.localeCompare(b.uploadedAt) || a.id.localeCompare(b.id)) *
        dir
      );
  }
}

export function DashboardUploadActivity({
  items,
  reportHref,
}: DashboardUploadActivityProps) {
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
        description="Report uploads for this period will appear here."
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
                label="Submitted by"
                active={sortBy === "actorRole"}
                direction={sortDir}
                onSort={() => applySort("actorRole")}
              />
              <SortableDataTableTh
                label="OpCo / Partner"
                active={sortBy === "lane"}
                direction={sortDir}
                onSort={() => applySort("lane")}
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
              <DataTableRow key={upload.id}>
                <DataTableTd>
                  <Link
                    href={reportHref(upload.id)}
                    className="underline decoration-foreground-subtle underline-offset-2 hover:text-foreground hover:decoration-foreground"
                  >
                    {upload.actorRole}
                  </Link>
                </DataTableTd>
                <DataTableTd className="text-foreground-muted">
                  <Link
                    href={reportHref(upload.id)}
                    className="underline decoration-foreground-subtle underline-offset-2 hover:text-foreground hover:decoration-foreground"
                  >
                    {upload.lane}
                  </Link>
                </DataTableTd>
                <DataTableTd className="text-foreground-muted" align="center">
                  <Link
                    href={reportHref(upload.id)}
                    className="underline decoration-foreground-subtle underline-offset-2 hover:text-foreground hover:decoration-foreground"
                  >
                    {formatAppDateTime(upload.uploadedAt)}
                  </Link>
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
