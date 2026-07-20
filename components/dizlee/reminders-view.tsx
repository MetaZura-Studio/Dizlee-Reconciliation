"use client";

import { useCallback, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
import { NotificationsTabs } from "@/components/dizlee/notifications-tabs";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { cn, ui } from "@/lib/ui/classes";
import {
  attachmentFileIds,
  NotificationAttachmentPicker,
  type PendingAttachment,
} from "@/components/shared/notification-attachment-picker";
import {
  DEFAULT_REMINDER_MESSAGE_SOURCE,
  type ReminderSettingsView,
  type SendReportRemindersInput,
} from "@/lib/dizlee/notifications/broadcast.shared";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import type {
  MissingSideFilter,
  ReportMonitoringResult,
} from "@/lib/dizlee/reports-monitoring";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";

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

function getTemplateContent(
  templates: ReminderSettingsView["templates"],
  code: string,
) {
  const template = templates.find((row) => row.code === code);
  return {
    subject: template?.subject ?? "",
    body: template?.body ?? "",
  };
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function reportMonitoringStatusTone(
  status: "Submitted" | "Missing",
): "success" | "warning" {
  return status === "Submitted" ? "success" : "warning";
}

function buildQuery(filters: {
  month: number;
  year: number;
  opcoId: string;
  partnerId: string;
  missing: MissingSideFilter | "";
  page: number;
}): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    page: String(filters.page),
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
  const [partnerId, setPartnerId] = useState(initialResult.filters.partnerId ?? "");
  const [missing, setMissing] = useState<MissingSideFilter | "">(
    initialResult.filters.missing ?? "any",
  );

  const [messageSource, setMessageSource] = useState<string>(
    DEFAULT_REMINDER_MESSAGE_SOURCE,
  );
  const initialTemplate = getTemplateContent(
    initialSettings.templates,
    DEFAULT_REMINDER_MESSAGE_SOURCE,
  );
  const [subject, setSubject] = useState(initialTemplate.subject);
  const [body, setBody] = useState(initialTemplate.body);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [selectedLaneKeys, setSelectedLaneKeys] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dizlee/notifications/reminders?${buildQuery({
            month,
            year,
            opcoId,
            partnerId,
            missing,
            page,
          })}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load reminders");
        }
        setResult(payload.data as ReportMonitoringResult);
        const nextSettings = payload.settings as ReminderSettingsView;
        setSettings(nextSettings);
        setFilterOptions(payload.filterOptions as ReportFilterOptions);
        setSelectedLaneKeys([]);
        const template = getTemplateContent(nextSettings.templates, messageSource);
        setSubject(template.subject);
        setBody(template.body);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load reminders",
        );
      } finally {
        setLoading(false);
      }
    },
    [messageSource, missing, month, opcoId, partnerId, year],
  );

  const handleMessageSourceChange = (source: string) => {
    setMessageSource(source);
    const template = getTemplateContent(settings.templates, source);
    setSubject(template.subject);
    setBody(template.body);
  };

  const toggleLane = (laneKey: string) => {
    setSelectedLaneKeys((current) =>
      current.includes(laneKey)
        ? current.filter((key) => key !== laneKey)
        : [...current, laneKey],
    );
  };

  const selectMissingOnPage = () => {
    const keys = result.items
      .filter(
        (lane) =>
          lane.opcoReport.status === "Missing" ||
          lane.partnerReport.status === "Missing",
      )
      .map((lane) => lane.laneKey);
    setSelectedLaneKeys(keys);
  };

  const sendReminders = async (target: SendReportRemindersInput["target"]) => {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/dizlee/notifications/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          laneKeys: selectedLaneKeys,
          target,
          messageSource,
          subject,
          body,
          attachmentFileIds: attachmentFileIds(attachments),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send reminders");
      }
      setMessage(payload.data.message as string);
      setSelectedLaneKeys([]);
      setAttachments([]);
      await loadData(result.page);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send reminders",
      );
    } finally {
      setSending(false);
    }
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
        title="Notifications"
        description="Send report submission reminders for missing uploads (UC-09)."
      />

      <NotificationsTabs active="reminders" />

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}
      {message ? <div className={`mt-4 ${ui.alertSuccess}`}>{message}</div> : null}

      <div className={cn(ui.cardPadding, "mt-4 text-sm text-foreground-muted")}>
        <p>
          <span className="font-medium">Automatic reminders (admin):</span>{" "}
          {settings.remindersEnabled ? "Enabled" : "Disabled"}
          {settings.remindersEnabled ? ` · Schedule: ${scheduleLabel}` : ""}
        </p>
        <p className="mt-1 text-foreground-subtle">
          Manual sends below use admin email templates. Placeholder:{" "}
          <code className="text-xs">{"{{period}}"}</code> is filled from the
          selected month and year.
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
        <div className="flex w-full gap-3">
          <Button onClick={() => void loadData(1)} disabled={loading}>
            Apply
          </Button>
          <Button variant="secondary" onClick={() => void loadData(result.page)} disabled={loading}>
            Refresh
          </Button>
        </div>
      </FilterToolbar>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="OpCo–Partner pairs" value={result.summary.linkedLanes} />
        <KpiCard label="OpCo missing" value={result.summary.opcoMissing} />
        <KpiCard label="Partner missing" value={result.summary.partnerMissing} />
        <KpiCard
          label="Selected pairs"
          value={selectedLaneKeys.length || "All"}
        />
      </div>
      <p className="mt-1 text-xs text-foreground-subtle">
        {selectedLaneKeys.length === 0
          ? "Empty selection sends to all pairs with missing reports"
          : "Only selected pairs"}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className={cn(ui.cardPaddingLg, "lg:col-span-2")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-foreground">OpCo–Partner pairs</h2>
            <Button variant="ghost" onClick={selectMissingOnPage}>
              Select missing on page
            </Button>
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="No pairs match filters"
              description="No OpCo–Partner pairs match the selected filters."
            />
          ) : (
            <>
              <DataTableFrame className="mt-4">
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableTh className="w-10">{" "}</DataTableTh>
                      <DataTableTh>OpCo / Partner</DataTableTh>
                      <DataTableTh>OpCo report</DataTableTh>
                      <DataTableTh>Partner report</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {result.items.map((lane) => (
                      <DataTableRow key={lane.laneKey}>
                        <DataTableTd>
                          <input
                            type="checkbox"
                            checked={selectedLaneKeys.includes(lane.laneKey)}
                            onChange={() => toggleLane(lane.laneKey)}
                            className="rounded border-border"
                          />
                        </DataTableTd>
                        <DataTableTd>
                          {lane.opcoName} / {lane.partnerName}
                        </DataTableTd>
                        <DataTableTd>
                          <StatusPill
                            tone={reportMonitoringStatusTone(lane.opcoReport.status)}
                          >
                            {lane.opcoReport.status}
                          </StatusPill>
                          {lane.opcoReport.uploadedAt ? (
                            <p className="mt-1 text-xs text-foreground-subtle">
                              {formatDateTime(lane.opcoReport.uploadedAt)}
                            </p>
                          ) : null}
                        </DataTableTd>
                        <DataTableTd>
                          <StatusPill
                            tone={reportMonitoringStatusTone(lane.partnerReport.status)}
                          >
                            {lane.partnerReport.status}
                          </StatusPill>
                          {lane.partnerReport.uploadedAt ? (
                            <p className="mt-1 text-xs text-foreground-subtle">
                              {formatDateTime(lane.partnerReport.uploadedAt)}
                            </p>
                          ) : null}
                        </DataTableTd>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableFrame>

              {result.totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between text-sm text-foreground-muted">
                  <span>
                    Page {result.page} of {result.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={result.page <= 1 || loading}
                      onClick={() => void loadData(result.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={result.page >= result.totalPages || loading}
                      onClick={() => void loadData(result.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className={ui.cardPaddingLg}>
          <h2 className="text-lg font-medium text-foreground">Reminder message</h2>
          <p className="mt-1 text-sm text-foreground-subtle">
            Choose an admin template and edit before sending.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className={ui.label}>Template</span>
              <select
                value={messageSource}
                onChange={(event) =>
                  handleMessageSourceChange(event.target.value)
                }
                className={ui.select}
              >
                {settings.templates.map((template) => (
                  <option key={template.code} value={template.code}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className={ui.label}>Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={255}
                className={ui.input}
              />
            </label>

            <label className="block text-sm">
              <span className={ui.label}>Body</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={8}
                className={cn(ui.input, "min-h-[12rem] resize-y py-2.5")}
              />
            </label>

            <p className={ui.hint}>
              Placeholder {"{{period}}"} uses the month and year filters above.
            </p>

            <NotificationAttachmentPicker
              attachments={attachments}
              onChange={setAttachments}
              disabled={sending}
            />

            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => void sendReminders("opco")}
                disabled={sending}
              >
                {sending ? "Sending…" : "Send OpCo reminders"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => void sendReminders("partner")}
                disabled={sending}
              >
                {sending ? "Sending…" : "Send Partner reminders"}
              </Button>
              <Button
                className="w-full"
                onClick={() => void sendReminders("both")}
                disabled={sending}
              >
                {sending ? "Sending…" : "Send both"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageCard>
  );
}
