"use client";

import Link from "next/link";
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
import { ListPagination } from "@/components/ui/list-pagination";
import { PageCard } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  ConsolidationDetail,
  ConsolidationItemView,
} from "@/lib/dizlee/consolidation";
import { ui } from "@/lib/ui/classes";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type ItemSortField =
  | "partner"
  | "service"
  | "description"
  | "usage"
  | "unit"
  | "kwd"
  | "exchangeRate"
  | "revenueBasis";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatUsd(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-KW", {
    style: "currency",
    currency: "KWD",
    maximumFractionDigits: 3,
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}

function statusTone(status: string): "success" | "info" | "warning" | "neutral" {
  const normalized = status.replaceAll(" ", "_").toUpperCase();
  if (normalized === "GENERATED" || normalized === "COMPLETED") {
    return "success";
  }
  if (normalized === "FAILED") {
    return "warning";
  }
  return "info";
}

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });
}

function compareNumber(a: number | null | undefined, b: number | null | undefined): number {
  const left = a ?? Number.NEGATIVE_INFINITY;
  const right = b ?? Number.NEGATIVE_INFINITY;
  return left - right;
}

function sortItems(
  items: ConsolidationItemView[],
  sortBy: ItemSortField,
  sortDir: SortDirection,
): ConsolidationItemView[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    let result = 0;
    switch (sortBy) {
      case "partner":
        result = compareText(left.partnerName, right.partnerName);
        break;
      case "service":
        result = compareText(left.serviceCode, right.serviceCode);
        break;
      case "description":
        result = compareText(left.description, right.description);
        break;
      case "usage":
        result = compareNumber(left.usageAmount, right.usageAmount);
        break;
      case "unit":
        result = compareText(left.usageUnit, right.usageUnit);
        break;
      case "kwd":
        result = compareNumber(left.usageUsd, right.usageUsd);
        break;
      case "exchangeRate":
        result = compareNumber(left.exchangeRate, right.exchangeRate);
        break;
      case "revenueBasis":
        result = compareText(left.revenueBasis, right.revenueBasis);
        break;
    }
    if (result === 0) {
      result = compareText(left.partnerName, right.partnerName);
    }
    return result * direction;
  });
}

type ConsolidationResultViewProps = {
  initialDetail: ConsolidationDetail;
};

export function ConsolidationResultView({
  initialDetail,
}: ConsolidationResultViewProps) {
  const [detail] = useState(initialDetail);
  const [downloading, setDownloading] = useState(false);
  const [itemPage, setItemPage] = useState(1);
  const [sortBy, setSortBy] = useState<ItemSortField>("partner");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const sortedItems = useMemo(
    () => sortItems(detail.items, sortBy, sortDir),
    [detail.items, sortBy, sortDir],
  );
  const pagedItems = paginateItems(sortedItems, itemPage);

  function applySort(field: ItemSortField) {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setItemPage(1);
  }

  function downloadExcel() {
    setDownloading(true);
    window.location.href = `/api/dizlee/consolidation/${detail.id}/export`;
    window.setTimeout(() => setDownloading(false), 1500);
  }

  return (
    <PageCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-foreground-muted">
            <Link
              href="/dizlee/consolidation?tab=history"
              className="underline hover:text-foreground"
            >
              ← Back to consolidation history
            </Link>
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {detail.opcoName}
          </h1>
          <p className="mt-1 text-sm text-foreground-subtle">
            {detail.period.label} ·{" "}
            <StatusPill tone={statusTone(detail.status)}>{detail.status}</StatusPill>
          </p>
          <p className="mt-1 text-xs text-foreground-subtle">
            Generated {formatDateTime(detail.generatedAt)} by {detail.runBy}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={downloading}
          onClick={downloadExcel}
        >
          {downloading ? "Downloading…" : "Download Excel"}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Total KWD</p>
          <p className="font-medium text-foreground">
            {formatUsd(detail.totalAmountUsd)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Line items</p>
          <p className="font-medium text-foreground">{detail.items.length}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Period</p>
          <p className="font-medium text-foreground">{detail.period.label}</p>
        </div>
      </div>

      {detail.items.length > 0 ? (
        <div className="mt-6 space-y-4">
          <DataTableFrame>
            <DataTable className="min-w-[64rem]">
              <DataTableHead>
                <tr>
                  <SortableDataTableTh
                    label="Partner"
                    active={sortBy === "partner"}
                    direction={sortDir}
                    onSort={() => applySort("partner")}
                  />
                  <SortableDataTableTh
                    label="Service"
                    active={sortBy === "service"}
                    direction={sortDir}
                    onSort={() => applySort("service")}
                  />
                  <SortableDataTableTh
                    label="Description"
                    active={sortBy === "description"}
                    direction={sortDir}
                    onSort={() => applySort("description")}
                  />
                  <SortableDataTableTh
                    label="Usage"
                    active={sortBy === "usage"}
                    direction={sortDir}
                    onSort={() => applySort("usage")}
                    align="right"
                  />
                  <SortableDataTableTh
                    label="Unit"
                    active={sortBy === "unit"}
                    direction={sortDir}
                    onSort={() => applySort("unit")}
                    align="right"
                  />
                  <SortableDataTableTh
                    label="KWD"
                    active={sortBy === "kwd"}
                    direction={sortDir}
                    onSort={() => applySort("kwd")}
                    align="right"
                  />
                  <SortableDataTableTh
                    label="Exchange rate"
                    active={sortBy === "exchangeRate"}
                    direction={sortDir}
                    onSort={() => applySort("exchangeRate")}
                    align="right"
                  />
                  <SortableDataTableTh
                    label="Revenue basis"
                    active={sortBy === "revenueBasis"}
                    direction={sortDir}
                    onSort={() => applySort("revenueBasis")}
                  />
                </tr>
              </DataTableHead>
              <tbody>
                {pagedItems.items.map((item, index) => (
                  <DataTableRow
                    key={`${item.partnerName}-${item.serviceCode}-${pagedItems.page}-${index}`}
                  >
                    <DataTableTd>{item.partnerName}</DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {item.serviceCode ?? "—"}
                    </DataTableTd>
                    <DataTableTd className="min-w-[14rem] text-foreground-muted">
                      {item.description || "—"}
                    </DataTableTd>
                    <DataTableTd align="right" className="text-foreground-muted">
                      {formatNumber(item.usageAmount)}
                    </DataTableTd>
                    <DataTableTd align="right" className="text-foreground-muted">
                      {item.usageUnit ?? "—"}
                    </DataTableTd>
                    <DataTableTd align="right" className="text-foreground-muted">
                      {formatUsd(item.usageUsd)}
                    </DataTableTd>
                    <DataTableTd align="right" className="text-foreground-muted">
                      {formatNumber(item.exchangeRate)}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {item.revenueBasis ?? "—"}
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>

          <ListPagination
            total={pagedItems.total}
            page={pagedItems.page}
            totalPages={pagedItems.totalPages}
            noun="line item"
            nounPlural="line items"
            onPageChange={setItemPage}
          />
        </div>
      ) : (
        <p className={`mt-4 ${ui.hint}`}>No consolidation line items.</p>
      )}
    </PageCard>
  );
}
