/**
 * Timeline of submission and platform events for a chosen OpCo or partner.
 * Helps operators investigate what changed during a billing period.
 */

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { FilterActions } from "@/components/ui/filter-actions";
import { LoadingOverlay } from "@/components/ui/loading";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  ActivityEvent,
  ActivityEventType,
  ActivityFilters,
  ActivityTimelineResult,
} from "@/lib/dizlee/activity.shared";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { ui } from "@/lib/ui/classes";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
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

function eventTone(
  type: ActivityEventType,
): "neutral" | "success" | "warning" | "danger" {
  switch (type) {
    case "REPORT_RECEIVED":
    case "INVOICE_ACKNOWLEDGED":
    case "INVOICE_PAID":
    case "CONSOLIDATION_GENERATED":
      return "success";
    case "REPORT_REMINDER_SENT":
    case "REUPLOAD_REQUESTED":
      return "warning";
    case "RECONCILIATION_RUN":
      return "neutral";
    case "INTIMATION_SENT":
    case "INVOICE_SENT":
    case "REUPLOAD_DECIDED":
    default:
      return "neutral";
  }
}

function eventTypeLabel(type: ActivityEventType): string {
  switch (type) {
    case "INTIMATION_SENT":
      return "Intimation";
    case "REPORT_REMINDER_SENT":
      return "Reminder";
    case "REPORT_RECEIVED":
      return "Report";
    case "REUPLOAD_REQUESTED":
      return "Reupload request";
    case "REUPLOAD_DECIDED":
      return "Reupload decision";
    case "RECONCILIATION_RUN":
      return "Reconciliation";
    case "CONSOLIDATION_GENERATED":
      return "Consolidation";
    case "INVOICE_SENT":
      return "Invoice";
    case "INVOICE_ACKNOWLEDGED":
      return "Invoice ack";
    case "INVOICE_PAID":
      return "Invoice paid";
    default:
      return type;
  }
}

function buildQuery(filters: ActivityFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
  });
  if (filters.opcoId) {
    params.set("opcoId", filters.opcoId);
  }
  if (filters.partnerId) {
    params.set("partnerId", filters.partnerId);
  }
  return params.toString();
}

type ActivityViewProps = {
  initialResult: ActivityTimelineResult;
  initialFilterOptions: ReportFilterOptions;
};

export function ActivityView({
  initialResult,
  initialFilterOptions,
}: ActivityViewProps) {
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(
    initialResult.filters.partnerId ?? "",
  );
  const [result, setResult] = useState<ActivityTimelineResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async (filters: ActivityFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/activity?${buildQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load activity"));
      }
      setResult(payload.data as ActivityTimelineResult);
      setFilterOptions(payload.filterOptions as ReportFilterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load activity",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const currentFilters = (): ActivityFilters => ({
    month,
    year,
    opcoId: opcoId || undefined,
    partnerId: partnerId || undefined,
  });

  const applyFilters = () => {
    void loadTimeline(currentFilters());
  };

  const refresh = () => {
    void loadTimeline(currentFilters());
  };

  const clearFilters = () => {
    const period = getCurrentPeriod();
    setMonth(period.month);
    setYear(period.year);
    setOpcoId("");
    setPartnerId("");
    void loadTimeline({
      month: period.month,
      year: period.year,
    });
  };

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);
  const events: ActivityEvent[] = result.events;
  const hasEntity = Boolean(opcoId || partnerId);
  const scopeLabel = [
    result.scope.opcoName,
    result.scope.partnerName,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <PageCard>
      <PageHeader
        title="Dizlee - Activity"
        description="Chronological timeline of intimations, reports, reconciliation, and invoices for an OpCo and/or Partner in a selected month."
      />

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className={ui.label}>Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className={ui.select}
            >
              {MONTHS.slice(0, maxMonth).map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
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
              <option value="">Select OpCo</option>
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
              <option value="">Select Partner</option>
              {filterOptions.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FilterActions
          onApply={applyFilters}
          onClear={clearFilters}
          onRefresh={refresh}
          loading={loading}
          disabled={!hasEntity}
        />
        <p className={ui.hint}>
          Select at least one OpCo or Partner. Selecting both narrows to that
          lane.
        </p>
      </FilterToolbar>

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      {!error ? (
        <LoadingOverlay active={loading} className="mt-6 min-h-[12rem]">
        {result.requiresEntity || !hasEntity ? (
          <EmptyState
            className="mt-6"
            title="Choose an OpCo or Partner"
            description="Pick a period and at least one entity to see the monthly activity timeline."
          />
        ) : events.length > 0 ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium text-foreground">
                  {result.period.label}
                  {scopeLabel ? ` · ${scopeLabel}` : ""}
                </h2>
                <p className="text-sm text-foreground-muted">
                  {events.length} event{events.length === 1 ? "" : "s"} · oldest
                  first
                </p>
              </div>
            </div>

            <ol className="relative space-y-4 border-l border-border pl-6">
              {events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.6rem] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={eventTone(event.type)}>
                            {eventTypeLabel(event.type)}
                          </StatusPill>
                          <p className="text-sm font-medium text-foreground">
                            {event.title}
                          </p>
                        </div>
                        <p className="text-sm text-foreground-muted">
                          {event.summary}
                        </p>
                        {event.lane ? (
                          <p className="text-xs text-foreground-subtle">
                            Lane: {event.lane.opcoName} / {event.lane.partnerName}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-foreground-subtle">
                          {formatAppDateTime(event.occurredAt)}
                        </p>
                        {event.href ? (
                          <Link
                            href={event.href}
                            className="mt-2 inline-block text-xs text-foreground-muted underline hover:text-foreground"
                          >
                            Open
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <EmptyState
            className="mt-6"
            title="No activity for this period"
            description="Nothing was recorded for the selected OpCo/Partner in this month yet."
          />
        )}
        </LoadingOverlay>
      ) : null}
    </PageCard>
  );
}
