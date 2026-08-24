/**
 * Monthly Revenue Share Report dashboard — multi-OpCo readiness overview (UI shell).
 * Live readiness / persistence APIs will replace mock row data in a later pass.
 */

"use client";

import { useMemo, useState } from "react";

import { IconButton } from "@/components/ui/icon-button";
import {
  IconDownload,
  IconEye,
  IconFile,
  IconLayers,
} from "@/components/ui/icons";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
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

type OpCoStatus =
  | "READY"
  | "OPCO_REPORT_MISSING"
  | "PARTNERS_REPORT_MISSING"
  | "GENERATED";

type PartnerDetail = {
  partnerName: string;
  hasPartnerReport: boolean;
};

type OpCoReadinessRow = {
  opcoId: string;
  opcoName: string;
  hasOpcoReport: boolean;
  status: OpCoStatus;
  partners: PartnerDetail[];
};

type RevenueShareViewProps = {
  initialMonth: number;
  initialYear: number;
  initialFilterOptions: ReportFilterOptions;
};

const DEMO_PARTNER_POOL = [
  "ArpuPlus",
  "DigitalVirgo",
  "Centili",
  "Karti",
  "Marvel Media",
  "GameBar",
  "OSN",
];

function statusMeta(status: OpCoStatus): {
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

/** Demo statuses so every action state is visible until the dashboard API ships. */
function buildMockRows(
  opcos: ReportFilterOptions["opcos"],
): OpCoReadinessRow[] {
  const cycle: OpCoStatus[] = [
    "READY",
    "PARTNERS_REPORT_MISSING",
    "OPCO_REPORT_MISSING",
    "GENERATED",
    "READY",
    "PARTNERS_REPORT_MISSING",
    "GENERATED",
  ];

  return opcos.map((opco, index) => {
    const status = cycle[index % cycle.length] ?? "READY";
    const hasOpcoReport = status !== "OPCO_REPORT_MISSING";
    const partnerNames = DEMO_PARTNER_POOL.slice(0, 3 + (index % 3));

    const partners: PartnerDetail[] =
      status === "OPCO_REPORT_MISSING"
        ? []
        : partnerNames.map((partnerName, partnerIndex) => ({
            partnerName,
            hasPartnerReport:
              status === "READY" ||
              status === "GENERATED" ||
              partnerIndex < partnerNames.length - 1,
          }));

    return {
      opcoId: opco.id,
      opcoName: opco.name,
      hasOpcoReport,
      status,
      partners,
    };
  });
}

export function RevenueShareView({
  initialMonth,
  initialYear,
  initialFilterOptions,
}: RevenueShareViewProps) {
  const toast = useToast();
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [filterOptions] = useState(initialFilterOptions);
  const [detailsRow, setDetailsRow] = useState<OpCoReadinessRow | null>(null);

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const rows = useMemo(
    () => buildMockRows(filterOptions.opcos),
    [filterOptions.opcos],
  );

  const summary = useMemo(() => {
    const total = rows.length;
    let ready = 0;
    let pendingMissing = 0;
    let generated = 0;
    for (const row of rows) {
      if (row.status === "READY") {
        ready += 1;
      } else if (row.status === "GENERATED") {
        generated += 1;
      } else {
        pendingMissing += 1;
      }
    }
    return { total, ready, pendingMissing, generated };
  }, [rows]);

  function notifyComingSoon(action: string) {
    toast.success(
      `${action} will be available once RS report storage is connected.`,
    );
  }

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
              onChange={(event) => setMonth(Number(event.target.value))}
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
              onChange={(event) => setYear(Number(event.target.value))}
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
            Status for{" "}
            {new Date(year, month - 1, 1).toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            })}
            . Change month or year above to review another period.
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No OpCos found." />
        ) : (
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableTh>OpCo</DataTableTh>
                  <DataTableTh>OpCo report</DataTableTh>
                  <DataTableTh>Status</DataTableTh>
                  <DataTableTh>Action</DataTableTh>
                </DataTableRow>
              </DataTableHead>
              <tbody>
                {rows.map((row) => {
                  const meta = statusMeta(row.status);
                  return (
                    <DataTableRow key={row.opcoId}>
                      <DataTableTd>
                        <span className="font-medium text-foreground">
                          {row.opcoName}
                        </span>
                      </DataTableTd>
                      <DataTableTd>
                        <StatusPill
                          tone={row.hasOpcoReport ? "success" : "danger"}
                        >
                          {row.hasOpcoReport ? "Received" : "Missing"}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd>
                        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                      </DataTableTd>
                      <DataTableTd>
                        <div className="flex flex-wrap items-center gap-2">
                          {row.status === "READY" ? (
                            <IconButton
                              label="Generate report"
                              variant="primary"
                              onClick={() =>
                                notifyComingSoon("Generate Report")
                              }
                            >
                              <IconFile />
                            </IconButton>
                          ) : null}
                          {row.status === "OPCO_REPORT_MISSING" ||
                          row.status === "PARTNERS_REPORT_MISSING" ? (
                            <IconButton
                              label="View details"
                              onClick={() => setDetailsRow(row)}
                            >
                              <IconLayers />
                            </IconButton>
                          ) : null}
                          {row.status === "GENERATED" ? (
                            <>
                              <IconButton
                                label="View"
                                onClick={() => notifyComingSoon("View")}
                              >
                                <IconEye />
                              </IconButton>
                              <IconButton
                                label="Download"
                                onClick={() => notifyComingSoon("Download")}
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
      </PageCard>

      {detailsRow ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close details"
            onClick={() => setDetailsRow(null)}
          />
          <aside
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-[var(--shadow-md)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rs-details-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2
                  id="rs-details-title"
                  className="text-lg font-semibold text-foreground"
                >
                  {detailsRow.opcoName}
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Why this report cannot be generated yet.
                </p>
              </div>
              <ModalCloseButton onClick={() => setDetailsRow(null)} />
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
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
                  Upload the OpCo bulk report for this period first. Partner
                  status is unavailable until that file is in.
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
                            key={partner.partnerName}
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
                            key={partner.partnerName}
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
          </aside>
        </div>
      ) : null}
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
