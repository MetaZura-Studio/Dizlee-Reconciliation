/**
 * Communications → Reminders: list missing OpCo–Partner pairs; remind via per-row send action.
 */

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { CommunicationsTabs } from "@/components/dizlee/communications-tabs";
import { LaneRemindModal } from "@/components/dizlee/lane-remind-modal";
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
import { FilterActions } from "@/components/ui/filter-actions";
import { IconButton } from "@/components/ui/icon-button";
import { IconSend } from "@/components/ui/icons";
import { ListPagination } from "@/components/ui/list-pagination";
import { LoadingOverlay } from "@/components/ui/loading";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import type { ReminderSettingsView } from "@/lib/dizlee/notifications/broadcast.shared";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import type {
  MissingSideFilter,
  ReportMonitoringLane,
  ReportMonitoringResult,
  ReportMonitoringSortField,
} from "@/lib/dizlee/reports-monitoring.shared";
import {
  monitoringLaneNeedsReminder,
  monitoringLaneToCompareLane,
} from "@/lib/dizlee/reports-monitoring.shared";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import {
  formatAppDateTime,
  formatAppMonthYear,
} from "@/lib/platform/format-datetime";
import { formatAppError } from "@/lib/errors/format";

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

function reportMonitoringStatusTone(
  status: "Submitted" | "Missing",
): "success" | "warning" {
  return status === "Submitted" ? "success" : "warning";
}

function lastReminderLabel(lane: ReportMonitoringLane): string {
  const times = [
    lane.lastOpcoReminderAt,
    lane.lastPartnerReminderAt,
    lane.lastOpcoIntimationAt,
    lane.lastPartnerIntimationAt,
  ].filter((value): value is string => Boolean(value));

  if (times.length === 0) {
    return "No reminders yet";
  }

  const latest = times.sort((a, b) => (a < b ? 1 : -1))[0];
  return `Last notice: ${formatAppDateTime(latest)}`;
}

function buildQuery(filters: {
  month: number;
  year: number;
  opcoId: string;
  partnerId: string;
  missing: MissingSideFilter | "";
  page: number;
  sortBy: ReportMonitoringSortField;
  sortDir: SortDirection;
}): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    page: String(filters.page),
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  });
  if (filters.opcoId) {
    params.set("opcoId", filters.opcoId);
  }
  if (filters.partnerId) {
    params.set("partnerId", filters.partnerId);
  }
  if (filters.missing) {
    params.set("missing", filters.missing);
  }
  return params.toString();
}

type RemindersViewProps = {
  initialResult: ReportMonitoringResult;
  initialSettings: ReminderSettingsView;
  initialFilterOptions: ReportFilterOptions;
};

export function RemindersView({
  initialResult,
  initialSettings,
  initialFilterOptions,
}: RemindersViewProps) {
  const [result, setResult] = useState(initialResult);
  const [settings, setSettings] = useState(initialSettings);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);

  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(
    initialResult.filters.partnerId ?? "",
  );
  const [missing, setMissing] = useState<MissingSideFilter | "">(
    initialResult.filters.missing ?? "any",
  );
  const [sortBy, setSortBy] = useState<ReportMonitoringSortField>(
    initialResult.filters.sortBy,
  );
  const [sortDir, setSortDir] = useState<SortDirection>(
    initialResult.filters.sortDir,
  );

  const [remindLane, setRemindLane] = useState<ReportMonitoringLane | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  type ReminderListFilters = {
    month: number;
    year: number;
    opcoId: string;
    partnerId: string;
    missing: MissingSideFilter | "";
    sortBy: ReportMonitoringSortField;
    sortDir: SortDirection;
  };

  const fetchReminders = useCallback(
    async (page: number, filters: ReminderListFilters) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dizlee/notifications/reminders?${buildQuery({
            ...filters,
            page,
          })}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load reminders"));
        }
        setResult(payload.data as ReportMonitoringResult);
        setSettings(payload.settings as ReminderSettingsView);
        setFilterOptions(payload.filterOptions as ReportFilterOptions);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load reminders",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadData = useCallback(
    async (page = 1, filterOverrides?: Partial<ReminderListFilters>) => {
      await fetchReminders(page, {
        month: filterOverrides?.month ?? month,
        year: filterOverrides?.year ?? year,
        opcoId: filterOverrides?.opcoId ?? opcoId,
        partnerId: filterOverrides?.partnerId ?? partnerId,
        missing: filterOverrides?.missing ?? missing,
        sortBy: filterOverrides?.sortBy ?? sortBy,
        sortDir: filterOverrides?.sortDir ?? sortDir,
      });
    },
    [fetchReminders, missing, month, opcoId, partnerId, sortBy, sortDir, year],
  );

  const applySort = (field: ReportMonitoringSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    void loadData(1, {
      sortBy: next.sortBy,
      sortDir: next.sortDir,
    });
  };

  const clearFilters = () => {
    const period = getCurrentPeriod();
    setMonth(period.month);
    setYear(period.year);
    setOpcoId("");
    setPartnerId("");
    setMissing("any");
    setSortBy(initialResult.filters.sortBy);
    setSortDir(initialResult.filters.sortDir);
    void loadData(1, {
      month: period.month,
      year: period.year,
      opcoId: "",
      partnerId: "",
      missing: "any",
      sortBy: initialResult.filters.sortBy,
      sortDir: initialResult.filters.sortDir,
    });
  };

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const scheduleLabel =
    settings.reminderValue && settings.reminderUnit
      ? `${settings.reminderValue} ${settings.reminderUnit}`
      : "Not configured";

  return (
    <PageCard>
      <PageHeader
        title="Communications"
        description="Review OpCo–Partner pairs with missing reports and send reminders from each row. Sent items appear in Outbox."
      />

      <CommunicationsTabs active="reminders" />

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      <div className={`${ui.cardPadding} mt-4 text-sm text-foreground-muted`}>
        <p>
          <span className="font-medium text-foreground">
            Automatic reminders (admin):
          </span>{" "}
          {settings.remindersEnabled ? "Enabled" : "Disabled"}
          {settings.remindersEnabled ? ` · Schedule: ${scheduleLabel}` : ""}
        </p>
        <p className="mt-1 text-foreground-subtle">
          Manual sends use the send action on each row. History:{" "}
          <Link
            href="/dizlee/communications?tab=outbox&filter=reminder"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Outbox
          </Link>
          .
        </p>
      </div>

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className={ui.label}>Month</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className={ui.select}
            >
              {MONTHS.slice(0, maxMonth).map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className={ui.label}>Year</span>
            <select
              value={year}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                const capped = getMaxMonthForYear(nextYear);
                if (month > capped) {
                  setMonth(capped);
                }
              }}
              className={ui.select}
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className={ui.label}>OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className={ui.select}
            >
              <option value="">All</option>
              {filterOptions.opcos.map((opco) => (
                <option key={opco.id} value={opco.id}>
                  {opco.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className={ui.label}>Partner</span>
            <select
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className={ui.select}
            >
              <option value="">All</option>
              {filterOptions.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className={ui.label}>Missing</span>
            <select
              value={missing}
              onChange={(event) =>
                setMissing(event.target.value as MissingSideFilter | "")
              }
              className={ui.select}
            >
              <option value="any">Any side</option>
              <option value="opco">OpCo report</option>
              <option value="partner">Partner report</option>
            </select>
          </label>
        </div>
        <FilterActions
          onApply={() => void loadData(1)}
          onClear={clearFilters}
          onRefresh={() => void loadData(result.page)}
          loading={loading}
        />
      </FilterToolbar>

      <div className="mt-6">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-lg font-medium text-foreground">
            {MONTHS[result.filters.month - 1]} {result.filters.year}{" "}
            OpCo–Partner pairs
          </h2>

          {result.items.length === 0 ? (
            <LoadingOverlay active={loading} className="mt-4 min-h-[12rem]">
              <EmptyState
                className="mt-0"
                title="No pairs match filters"
                description="No OpCo–Partner pairs match the selected filters."
              />
            </LoadingOverlay>
          ) : (
            <LoadingOverlay active={loading} className="mt-4 min-h-[12rem]">
              <div className="space-y-4">
                <DataTableFrame className="mt-0 w-full max-w-full">
                  <DataTable className="min-w-0 w-auto table-auto">
                    <DataTableHead>
                      <tr>
                        <SortableDataTableTh
                          label="Period"
                          active={sortBy === "period"}
                          direction={sortDir}
                          onSort={() => applySort("period")}
                          className="whitespace-nowrap px-3"
                          align="center"
                        />
                        <SortableDataTableTh
                          label="OpCo"
                          active={sortBy === "opco"}
                          direction={sortDir}
                          onSort={() => applySort("opco")}
                          className="whitespace-nowrap px-3"
                        />
                        <SortableDataTableTh
                          label="Partner"
                          active={sortBy === "partner"}
                          direction={sortDir}
                          onSort={() => applySort("partner")}
                          className="whitespace-nowrap px-3"
                        />
                        <DataTableTh
                          className="whitespace-nowrap px-3"
                          align="center"
                        >
                          OpCo report
                        </DataTableTh>
                        <DataTableTh
                          className="whitespace-nowrap px-3"
                          align="center"
                        >
                          Partner report
                        </DataTableTh>
                        <DataTableTh
                          className="whitespace-nowrap px-3"
                          align="center"
                        >
                          Actions
                        </DataTableTh>
                      </tr>
                    </DataTableHead>
                    <tbody>
                      {result.items.map((lane) => (
                        <DataTableRow key={lane.laneKey}>
                          <DataTableTd
                            className="whitespace-nowrap px-3 text-foreground-muted"
                            align="center"
                          >
                            {formatAppMonthYear(
                              lane.period.month,
                              lane.period.year,
                            )}
                          </DataTableTd>
                          <DataTableTd className="whitespace-nowrap px-3">
                            {lane.opcoName}
                          </DataTableTd>
                          <DataTableTd className="whitespace-nowrap px-3">
                            {lane.partnerName}
                          </DataTableTd>
                          <DataTableTd
                            className="whitespace-nowrap px-3"
                            align="center"
                          >
                            <StatusPill
                              tone={reportMonitoringStatusTone(
                                lane.opcoReport.status,
                              )}
                            >
                              {lane.opcoReport.status}
                            </StatusPill>
                            {lane.opcoReport.uploadedAt ? (
                              <p className="mt-1 text-xs text-foreground-subtle">
                                {formatAppDateTime(lane.opcoReport.uploadedAt)}
                              </p>
                            ) : null}
                          </DataTableTd>
                          <DataTableTd
                            className="whitespace-nowrap px-3"
                            align="center"
                          >
                            <StatusPill
                              tone={reportMonitoringStatusTone(
                                lane.partnerReport.status,
                              )}
                            >
                              {lane.partnerReport.status}
                            </StatusPill>
                            {lane.partnerReport.uploadedAt ? (
                              <p className="mt-1 text-xs text-foreground-subtle">
                                {formatAppDateTime(
                                  lane.partnerReport.uploadedAt,
                                )}
                              </p>
                            ) : null}
                          </DataTableTd>
                          <DataTableTd className="px-3" align="center">
                            {monitoringLaneNeedsReminder(lane) ? (
                              <IconButton
                                label={
                                  lane.notificationCount > 0
                                    ? `Remind… · ${lastReminderLabel(lane)} · ${lane.notificationCount} prior notice${lane.notificationCount === 1 ? "" : "s"}`
                                    : `Remind… · ${lastReminderLabel(lane)}`
                                }
                                onClick={() => setRemindLane(lane)}
                              >
                                <IconSend />
                              </IconButton>
                            ) : (
                              <span className="text-xs text-foreground-subtle">
                                —
                              </span>
                            )}
                          </DataTableTd>
                        </DataTableRow>
                      ))}
                    </tbody>
                  </DataTable>
                </DataTableFrame>

                <ListPagination
                  total={result.totalCount}
                  page={result.page}
                  totalPages={result.totalPages}
                  noun="pair"
                  onPageChange={(page) => void loadData(page)}
                  loading={loading}
                />
              </div>
            </LoadingOverlay>
          )}
        </section>
      </div>

      {remindLane ? (
        <LaneRemindModal
          lane={monitoringLaneToCompareLane(remindLane)}
          month={remindLane.period.month}
          year={remindLane.period.year}
          onClose={() => setRemindLane(null)}
          onSent={(sentMessage) => {
            toast.success(sentMessage);
            setRemindLane(null);
            void loadData(result.page);
          }}
        />
      ) : null}
    </PageCard>
  );
}
