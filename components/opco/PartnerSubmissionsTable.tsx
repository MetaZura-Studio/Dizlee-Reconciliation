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
import { ListPagination } from "@/components/ui/list-pagination";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  PartnerSubmissionStatus,
  PartnerSubmissionSummary,
} from "@/lib/opco/queries/dashboard";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { paginateItems } from "@/lib/ui/list-pagination";
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

type PartnerSubmissionsTableProps = {
  partners: PartnerSubmissionSummary[];
};

export function PartnerSubmissionsTable({ partners }: PartnerSubmissionsTableProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("partner");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const sorted = useMemo(() => {
    const rows = [...partners];
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
  }, [partners, sortBy, sortDir]);

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
    </div>
  );
}
