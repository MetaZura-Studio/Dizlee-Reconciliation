/**
 * Detail view for a single consolidation run including status and export actions.
 * Displayed after generating or opening a consolidation from history.
 */

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
  | "amount"
  | "revenueBasis";

type DisplayRow =
  | { kind: "item"; item: ConsolidationItemView; key: string }
  | {
      kind: "partnerTotal";
      partnerName: string;
      total: number;
      key: string;
    };

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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function itemAmount(item: ConsolidationItemView): number {
  return item.usageUsd ?? item.usageAmount ?? 0;
}

function sortItems(
  items: ConsolidationItemView[],
  sortBy: ItemSortField,
  sortDir: SortDirection,
): ConsolidationItemView[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    let result = compareText(left.partnerName, right.partnerName);
    if (result !== 0) {
      return result * (sortBy === "partner" ? direction : 1);
    }

    switch (sortBy) {
      case "partner":
        result = compareText(left.serviceCode, right.serviceCode);
        break;
      case "service":
        result = compareText(left.serviceCode, right.serviceCode);
        break;
      case "description":
        result = compareText(left.description, right.description);
        break;
      case "amount":
        result = compareNumber(itemAmount(left), itemAmount(right));
        break;
      case "revenueBasis":
        result = compareText(left.revenueBasis, right.revenueBasis);
        break;
    }
    if (result === 0) {
      result = compareText(left.serviceCode, right.serviceCode);
    }
    return result * direction;
  });
}

/** Group items by partner and append a month total row after each partner. */
function buildDisplayRows(items: ConsolidationItemView[]): DisplayRow[] {
  const rows: DisplayRow[] = [];
  let index = 0;

  while (index < items.length) {
    const partnerName = items[index]?.partnerName ?? "Partner";
    const group: ConsolidationItemView[] = [];
    while (index < items.length && items[index]?.partnerName === partnerName) {
      group.push(items[index]!);
      index += 1;
    }

    for (const [groupIndex, item] of group.entries()) {
      rows.push({
        kind: "item",
        item,
        key: `${partnerName}-${item.serviceCode}-${groupIndex}`,
      });
    }

    const total = group.reduce((sum, item) => sum + itemAmount(item), 0);
    rows.push({
      kind: "partnerTotal",
      partnerName,
      total,
      key: `total-${partnerName}`,
    });
  }

  return rows;
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

  const overallTotal = useMemo(() => {
    if (detail.totalAmountUsd !== null) {
      return detail.totalAmountUsd;
    }
    return detail.items.reduce((sum, item) => sum + itemAmount(item), 0);
  }, [detail.items, detail.totalAmountUsd]);

  const sortedItems = useMemo(
    () => sortItems(detail.items, sortBy, sortDir),
    [detail.items, sortBy, sortDir],
  );
  const displayRows = useMemo(
    () => buildDisplayRows(sortedItems),
    [sortedItems],
  );
  const pagedRows = paginateItems(displayRows, itemPage);

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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Overall total (USD)</p>
          <p className="font-medium text-foreground">{formatUsd(overallTotal)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Line items</p>
          <p className="font-medium text-foreground">{detail.items.length}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Partners</p>
          <p className="font-medium text-foreground">
            {new Set(detail.items.map((item) => item.partnerName)).size}
          </p>
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
                    label="Amount (USD)"
                    active={sortBy === "amount"}
                    direction={sortDir}
                    onSort={() => applySort("amount")}
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
                {pagedRows.items.map((row) =>
                  row.kind === "partnerTotal" ? (
                    <DataTableRow
                      key={row.key}
                      className="bg-surface-muted font-semibold"
                    >
                      <DataTableTd colSpan={3}>
                        {row.partnerName} — {detail.period.label} total
                      </DataTableTd>
                      <DataTableTd align="right">{formatUsd(row.total)}</DataTableTd>
                      <DataTableTd />
                    </DataTableRow>
                  ) : (
                    <DataTableRow key={row.key}>
                      <DataTableTd>{row.item.partnerName}</DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {row.item.serviceCode ?? "—"}
                      </DataTableTd>
                      <DataTableTd className="min-w-[14rem] text-foreground-muted">
                        {row.item.description || "—"}
                      </DataTableTd>
                      <DataTableTd align="right" className="text-foreground-muted">
                        {formatUsd(itemAmount(row.item))}
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {row.item.revenueBasis ?? "—"}
                      </DataTableTd>
                    </DataTableRow>
                  ),
                )}
              </tbody>
            </DataTable>
          </DataTableFrame>

          <ListPagination
            total={pagedRows.total}
            page={pagedRows.page}
            totalPages={pagedRows.totalPages}
            noun="row"
            nounPlural="rows"
            onPageChange={setItemPage}
          />
        </div>
      ) : (
        <p className={`mt-4 ${ui.hint}`}>No consolidation line items.</p>
      )}
    </PageCard>
  );
}
