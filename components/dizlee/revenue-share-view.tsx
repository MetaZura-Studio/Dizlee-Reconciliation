/**
 * Monthly RS Reports dashboard — live multi-OpCo readiness, generate, view, download.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
import { IconButton } from "@/components/ui/icon-button";
import {
  IconAlert,
  IconDownload,
  IconEye,
  IconFile,
  IconRefresh,
} from "@/components/ui/icons";
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
import { FieldLabel, Select } from "@/components/ui/field";
import { FilterActions } from "@/components/ui/filter-actions";
import { ListPagination } from "@/components/ui/list-pagination";
import { LoadingOverlay } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import type {
  RevenueShareDashboard,
  RevenueShareDashboardRow,
  RevenueShareDashboardStatus,
} from "@/lib/dizlee/revenue-share";
import { formatAppMonthYear } from "@/lib/platform/format-datetime";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { formatAppError } from "@/lib/errors/format";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type RevenueShareViewProps = {
  initialMonth: number;
  initialYear: number;
  initialDashboard: RevenueShareDashboard;
};

type RsSortField = "opco" | "status";
type RsStatusFilter = RevenueShareDashboardStatus | "all";

const STATUS_FILTER_OPTIONS: Array<{ value: RsStatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "READY", label: "Ready" },
  { value: "GENERATED", label: "Generated" },
  { value: "OPCO_REPORT_MISSING", label: "OpCo report missing" },
  { value: "PARTNERS_REPORT_MISSING", label: "Partners report missing" },
];

function statusMeta(status: RevenueShareDashboardStatus): {
  label: string;
  tone: "success" | "warning" | "danger" | "info";
} {
  switch (status) {
    case "READY":
      return { label: "Ready", tone: "success" };
    case "GENERATED":
      return { label: "Generated", tone: "info" };
    case "PARTNERS_REPORT_MISSING":
      return { label: "Partners report missing", tone: "warning" };
    case "OPCO_REPORT_MISSING":
      return { label: "OpCo report missing", tone: "danger" };
  }
}

function compareRsRows(
  a: RevenueShareDashboardRow,
  b: RevenueShareDashboardRow,
  sortBy: RsSortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  if (sortBy === "status") {
    const byStatus =
      statusMeta(a.status).label.localeCompare(statusMeta(b.status).label) * dir;
    if (byStatus !== 0) {
      return byStatus;
    }
  }
  return a.opcoName.localeCompare(b.opcoName) * (sortBy === "opco" ? dir : 1);
}

function periodQuery(month: number, year: number): string {
  return new URLSearchParams({
    month: String(month),
    year: String(year),
  }).toString();
}

export function RevenueShareView({
  initialMonth,
  initialYear,
  initialDashboard,
}: RevenueShareViewProps) {
  const toast = useToast();
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [appliedMonth, setAppliedMonth] = useState(initialMonth);
  const [appliedYear, setAppliedYear] = useState(initialYear);
  const [opcoId, setOpcoId] = useState("");
  const [statusFilter, setStatusFilter] = useState<RsStatusFilter>("all");
  const [appliedOpcoId, setAppliedOpcoId] = useState("");
  const [appliedStatusFilter, setAppliedStatusFilter] =
    useState<RsStatusFilter>("all");
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [loading, setLoading] = useState(false);
  const [generatingOpcoId, setGeneratingOpcoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<RevenueShareDashboardRow | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<RsSortField>("opco");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const loadDashboard = useCallback(async (nextMonth: number, nextYear: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/revenue-share/dashboard?${periodQuery(nextMonth, nextYear)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load RS dashboard"));
      }
      setDashboard(payload.data as RevenueShareDashboard);
      setAppliedMonth(nextMonth);
      setAppliedYear(nextYear);
      setPage(1);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load RS dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      void loadDashboard(appliedMonth, appliedYear);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [appliedMonth, appliedYear, loadDashboard]);

  function applyFilters() {
    setAppliedOpcoId(opcoId);
    setAppliedStatusFilter(statusFilter);
    setPage(1);
    void loadDashboard(month, year);
  }

  function clearFilters() {
    const period = getCurrentPeriod();
    setMonth(period.month);
    setYear(period.year);
    setOpcoId("");
    setStatusFilter("all");
    setAppliedOpcoId("");
    setAppliedStatusFilter("all");
    setPage(1);
    void loadDashboard(period.month, period.year);
  }

  function refresh() {
    void loadDashboard(appliedMonth, appliedYear);
  }

  function applySort(field: RsSortField) {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  }

  async function generateReport(row: RevenueShareDashboardRow) {
    setGeneratingOpcoId(row.opcoId);
    setError(null);
    try {
      const response = await fetch("/api/dizlee/revenue-share/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: appliedMonth,
          year: appliedYear,
          opcoId: row.opcoId,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(formatAppError(payload, "Failed to generate RS report"));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^"]+)"?/i.exec(disposition);
      const filename = match?.[1] ?? `revenue_share_${row.opcoName}.xlsx`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`RS report generated for ${row.opcoName}.`);
      await loadDashboard(appliedMonth, appliedYear);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Failed to generate RS report",
      );
    } finally {
      setGeneratingOpcoId(null);
    }
  }

  const summary = dashboard.summary;

  const opcoOptions = useMemo(
    () =>
      [...dashboard.rows]
        .map((row) => ({ id: row.opcoId, name: row.opcoName }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [dashboard.rows],
  );

  const filteredRows = useMemo(() => {
    return dashboard.rows.filter((row) => {
      if (appliedOpcoId && row.opcoId !== appliedOpcoId) {
        return false;
      }
      if (
        appliedStatusFilter !== "all" &&
        row.status !== appliedStatusFilter
      ) {
        return false;
      }
      return true;
    });
  }, [appliedOpcoId, appliedStatusFilter, dashboard.rows]);

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((a, b) => compareRsRows(a, b, sortBy, sortDir)),
    [filteredRows, sortBy, sortDir],
  );
  const pagedRows = useMemo(
    () => paginateItems(sortedRows, page),
    [page, sortedRows],
  );

  return (
    <div className="space-y-6">
      <PageCard>
        <PageHeader
          title="RS Reports"
          description="Review readiness across all OpCos for the selected period. Generate when OpCo and Partner reports are in."
        />

        <FilterToolbar>
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              <FieldLabel>Month</FieldLabel>
              <Select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {MONTHS.slice(0, maxMonth).map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <FieldLabel>Year</FieldLabel>
              <Select
                value={year}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setYear(nextYear);
                  const capped = getMaxMonthForYear(nextYear);
                  if (month > capped) setMonth(capped);
                }}
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <FieldLabel>OpCo</FieldLabel>
              <Select
                value={opcoId}
                onChange={(event) => setOpcoId(event.target.value)}
              >
                <option value="">All OpCos</option>
                {opcoOptions.map((opco) => (
                  <option key={opco.id} value={opco.id}>
                    {opco.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <FieldLabel>Status</FieldLabel>
              <Select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as RsStatusFilter)
                }
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <FilterActions
            onApply={applyFilters}
            onClear={clearFilters}
            onRefresh={refresh}
            loading={loading}
          />
        </FilterToolbar>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total OpCos" value={summary.total} tone="blue" />
          <KpiCard label="Ready" value={summary.ready} tone="teal" />
          <KpiCard
            label="Pending (reports missing)"
            value={summary.pendingMissing}
            tone="amber"
          />
          <KpiCard label="Generated" value={summary.generated} tone="purple" />
        </div>
      </PageCard>

      <PageCard>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">
            OpCo readiness
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Status for {formatAppMonthYear(appliedMonth, appliedYear)}. Apply
            filters above to narrow OpCos or change period.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <LoadingOverlay active={loading} className="min-h-[12rem]">
          {pagedRows.total === 0 ? (
            <EmptyState
              title="No OpCos found"
              description="Adjust period, OpCo, or status filters to see readiness rows."
            />
          ) : (
            <div className="space-y-4">
              <DataTableFrame>
                <DataTable>
                  <DataTableHead>
                    <DataTableRow>
                      <SortableDataTableTh
                        label="OpCo"
                        active={sortBy === "opco"}
                        direction={sortDir}
                        onSort={() => applySort("opco")}
                      />
                      <DataTableTh align="center">OpCo report</DataTableTh>
                      <SortableDataTableTh
                        label="Status"
                        active={sortBy === "status"}
                        direction={sortDir}
                        onSort={() => applySort("status")}
                        align="center"
                      />
                      <DataTableTh align="center">Action</DataTableTh>
                    </DataTableRow>
                  </DataTableHead>
                  <tbody>
                    {pagedRows.items.map((row) => {
                      const meta = statusMeta(row.status);
                      const busy = generatingOpcoId === row.opcoId;
                      return (
                        <DataTableRow key={row.opcoId}>
                          <DataTableTd>
                            <span className="font-medium text-foreground">
                              {row.opcoName}
                            </span>
                          </DataTableTd>
                          <DataTableTd align="center">
                            <StatusPill
                              tone={row.hasOpcoReport ? "success" : "danger"}
                            >
                              {row.hasOpcoReport ? "Received" : "Missing"}
                            </StatusPill>
                          </DataTableTd>
                          <DataTableTd align="center">
                            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                          </DataTableTd>
                          <DataTableTd align="center">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {row.status === "READY" ||
                              row.status === "GENERATED" ? (
                                <IconButton
                                  label={
                                    busy
                                      ? "Generating…"
                                      : row.status === "GENERATED"
                                        ? "Regenerate report"
                                        : "Generate report"
                                  }
                                  variant="primary"
                                  disabled={busy || loading}
                                  onClick={() => void generateReport(row)}
                                >
                                  {row.status === "GENERATED" ? (
                                    <IconRefresh />
                                  ) : (
                                    <IconFile />
                                  )}
                                </IconButton>
                              ) : null}
                              {row.status === "OPCO_REPORT_MISSING" ||
                              row.status === "PARTNERS_REPORT_MISSING" ? (
                                <IconButton
                                  label="View details"
                                  onClick={() => setDetailsRow(row)}
                                >
                                  <IconAlert />
                                </IconButton>
                              ) : null}
                              {row.status === "GENERATED" &&
                              row.generatedReportId != null ? (
                                <>
                                  <IconButton
                                    label="View report"
                                    onClick={() => {
                                      window.open(
                                        `/api/dizlee/revenue-share/${row.generatedReportId}/preview`,
                                        "_blank",
                                        "noopener,noreferrer",
                                      );
                                    }}
                                  >
                                    <IconEye />
                                  </IconButton>
                                  <IconButton
                                    label="Download report"
                                    onClick={() => {
                                      window.location.href = `/api/dizlee/revenue-share/${row.generatedReportId}/download`;
                                    }}
                                  >
                                    <IconDownload />
                                  </IconButton>
                                </>
                              ) : null}
                            </div>
                          </DataTableTd>
                        </DataTableRow>
                      );
                    })}
                  </tbody>
                </DataTable>
              </DataTableFrame>

              <ListPagination
                total={pagedRows.total}
                page={pagedRows.page}
                totalPages={pagedRows.totalPages}
                noun="OpCo"
                nounPlural="OpCos"
                onPageChange={setPage}
                loading={loading}
              />
            </div>
          )}
        </LoadingOverlay>
      </PageCard>

      <Modal
        open={detailsRow !== null}
        title={detailsRow?.opcoName ?? "Details"}
        onClose={() => setDetailsRow(null)}
      >
        {detailsRow ? (
          <div className="space-y-5">
            <p className="text-sm text-foreground-muted">
              Why this report cannot be generated yet.
            </p>

            <div>
              <p className="text-xs font-semibold tracking-wide text-foreground-muted">
                OpCo report
              </p>
              <div className="mt-2">
                <StatusPill
                  tone={detailsRow.hasOpcoReport ? "success" : "danger"}
                >
                  {detailsRow.hasOpcoReport ? "Received" : "Missing"}
                </StatusPill>
              </div>
            </div>

            {detailsRow.status === "OPCO_REPORT_MISSING" ? (
              <p className="text-sm text-foreground-muted">
                Upload the OpCo bulk report for this period first. Partner status
                is unavailable until that file is in.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-foreground-muted">
                    Partner reports received
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {detailsRow.partners
                      .filter((partner) => partner.hasPartnerReport)
                      .map((partner) => (
                        <li
                          key={partner.partnerId}
                          className="rounded-xl border border-success-border bg-success-muted px-3 py-2 text-sm text-success"
                        >
                          {partner.partnerName}
                        </li>
                      ))}
                    {detailsRow.partners.every(
                      (partner) => !partner.hasPartnerReport,
                    ) ? (
                      <li className="text-sm text-foreground-subtle">
                        None received yet.
                      </li>
                    ) : null}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold tracking-wide text-foreground-muted">
                    Partner reports missing
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {detailsRow.partners
                      .filter((partner) => !partner.hasPartnerReport)
                      .map((partner) => (
                        <li
                          key={partner.partnerId}
                          className="rounded-xl border border-warning-border bg-warning-muted px-3 py-2 text-sm text-warning"
                        >
                          {partner.partnerName}
                        </li>
                      ))}
                    {detailsRow.partners.every(
                      (partner) => partner.hasPartnerReport,
                    ) ? (
                      <li className="text-sm text-foreground-subtle">
                        None missing.
                      </li>
                    ) : null}
                  </ul>
                </div>
              </>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
