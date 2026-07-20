"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  OpcoSubmissionStatus,
  OpcoSubmissionSummary,
} from "@/lib/partner/queries/dashboard";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import { submissionStatusTone } from "@/lib/ui/status-tones";

const PAGE_SIZE = 10;

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
              />
              <SortableDataTableTh
                label="Last upload"
                active={sortBy === "uploaded"}
                direction={sortDir}
                onSort={() => applySort("uploaded")}
              />
            </tr>
          </DataTableHead>
          <tbody>
            {pageRows.map((opco) => (
              <DataTableRow key={opco.opcoId}>
                <DataTableTd className="font-medium text-foreground">
                  {opco.opcoName}
                </DataTableTd>
                <DataTableTd>
                  <StatusPill tone={submissionStatusTone(opco.status)}>
                    {STATUS_LABELS[opco.status]}
                  </StatusPill>
                </DataTableTd>
                <DataTableTd className="text-foreground-muted">
                  {opco.uploadedAt
                    ? new Date(opco.uploadedAt).toLocaleString()
                    : "—"}
                </DataTableTd>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      </DataTableFrame>

      {sorted.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm text-foreground-muted">
          <p>
            Page {safePage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
