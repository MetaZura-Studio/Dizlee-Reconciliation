/**
 * Monthly RS Reports dashboard — live multi-OpCo readiness, generate, view, download.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { IconDownload, IconEye } from "@/components/ui/icons";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
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
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { formatAppError } from "@/lib/errors/format";
import { cn, ui } from "@/lib/ui/classes";

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
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [loading, setLoading] = useState(false);
  const [generatingOpcoId, setGeneratingOpcoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<RevenueShareDashboardRow | null>(
    null,
  );

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
      void loadDashboard(month, year);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadDashboard, month, year]);

  function changeMonth(nextMonth: number) {
    setMonth(nextMonth);
    void loadDashboard(nextMonth, year);
  }

  function changeYear(nextYear: number) {
    const nextMaxMonth = getMaxMonthForYear(nextYear);
    const nextMonth = Math.min(month, nextMaxMonth);
    setYear(nextYear);
    setMonth(nextMonth);
    void loadDashboard(nextMonth, nextYear);
  }

  async function generateReport(row: RevenueShareDashboardRow) {
    setGeneratingOpcoId(row.opcoId);
    setError(null);
    try {
      const response = await fetch("/api/dizlee/revenue-share/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
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
      await loadDashboard(month, year);
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
  const rows = dashboard.rows;

  return (
    <div className="space-y-6">
      <PageCard>
        <PageHeader
          title="RS Reports"
          description="Review readiness across all OpCos for the selected period. Generate when OpCo and Partner reports are in."
        />

        <FilterToolbar>
          <label className={cn(ui.label, "min-w-40")}>
            Month
            <select
              className={ui.select}
              value={month}
              onChange={(event) => changeMonth(Number(event.target.value))}
            >
              {MONTHS.slice(0, maxMonth).map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={cn(ui.label, "min-w-28")}>
            Year
            <select
              className={ui.select}
              value={year}
              onChange={(event) => changeYear(Number(event.target.value))}
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </FilterToolbar>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total OpCos" value={summary.total} />
          <SummaryCard label="Ready" value={summary.ready} tone="success" />
          <SummaryCard
            label="Pending (reports missing)"
            value={summary.pendingMissing}
            tone="warning"
          />
          <SummaryCard
            label="Generated"
            value={summary.generated}
            tone="info"
          />
        </div>
      </PageCard>

      <PageCard>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">
            OpCo readiness
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Status for {formatAppMonthYear(month, year)}. Change month or year
            above to review another period.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <LoadingOverlay active={loading} className="min-h-[12rem]">
          {rows.length === 0 ? (
            <EmptyState title="No OpCos found." />
          ) : (
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <DataTableRow>
                    <DataTableTh>OpCo</DataTableTh>
                    <DataTableTh align="center">OpCo report</DataTableTh>
                    <DataTableTh align="center">Status</DataTableTh>
                    <DataTableTh align="center">Action</DataTableTh>
                  </DataTableRow>
                </DataTableHead>
                <tbody>
                  {rows.map((row) => {
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
                              <Button
                                type="button"
                                disabled={busy || loading}
                                onClick={() => void generateReport(row)}
                              >
                                {busy
                                  ? "Generating…"
                                  : row.status === "GENERATED"
                                    ? "Regenerate report"
                                    : "Generate report"}
                              </Button>
                            ) : null}
                            {row.status === "OPCO_REPORT_MISSING" ||
                            row.status === "PARTNERS_REPORT_MISSING" ? (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setDetailsRow(row)}
                              >
                                View details
                              </Button>
                            ) : null}
                            {row.status === "GENERATED" &&
                            row.generatedReportId != null ? (
                              <>
                                <IconButton
                                  label="View"
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
                                  label="Download"
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

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "info"
          ? "text-primary"
          : "text-foreground";

  return (
    <div className="rounded-2xl border border-border bg-surface-muted/40 px-4 py-3">
      <p className="text-xs font-semibold tracking-wide text-foreground-muted">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", valueClass)}>
        {value}
      </p>
    </div>
  );
}
