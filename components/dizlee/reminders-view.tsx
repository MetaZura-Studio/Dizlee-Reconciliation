"use client";

import { useCallback, useState } from "react";

import { NotificationsTabs } from "@/components/dizlee/notifications-tabs";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import type {
  ReminderSettingsView,
  SendReportRemindersInput,
} from "@/lib/dizlee/notifications/reminders";
import type {
  MissingSideFilter,
  ReportMonitoringResult,
} from "@/lib/dizlee/reports-monitoring";

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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

  const [subject, setSubject] = useState(initialSettings.templateSubject);
  const [body, setBody] = useState(initialSettings.templateBody);
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
        setSettings(payload.settings as ReminderSettingsView);
        setFilterOptions(payload.filterOptions as ReportFilterOptions);
        setSelectedLaneKeys([]);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load reminders",
        );
      } finally {
        setLoading(false);
      }
    },
    [missing, month, opcoId, partnerId, year],
  );

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
          subject,
          body,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send reminders");
      }
      setMessage(payload.data.message as string);
      setSelectedLaneKeys([]);
      await loadData(result.page);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send reminders",
      );
    } finally {
      setSending(false);
    }
  };

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const scheduleLabel =
    settings.reminderValue && settings.reminderUnit
      ? `${settings.reminderValue} ${settings.reminderUnit}`
      : "Not configured";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Send report submission reminders for missing uploads (UC-09).
        </p>
      </div>

      <NotificationsTabs active="reminders" />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <p>
          <span className="font-medium">Automatic reminders (admin):</span>{" "}
          {settings.remindersEnabled ? "Enabled" : "Disabled"}
          {settings.remindersEnabled ? ` · Schedule: ${scheduleLabel}` : ""}
        </p>
        <p className="mt-1 text-zinc-500">
          Manual sends below use the REPORT_REMINDER template. Placeholders:{" "}
          <code className="text-xs">{"{{period}}"}</code>,{" "}
          <code className="text-xs">{"{{opco_name}}"}</code>,{" "}
          <code className="text-xs">{"{{partner_name}}"}</code>,{" "}
          <code className="text-xs">{"{{lane}}"}</code>
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-sm">
            <span className="text-zinc-600">Month</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              {MONTHS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-zinc-600">Year</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-zinc-600">OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="">All</option>
              {filterOptions.opcos.map((opco) => (
                <option key={opco.id} value={opco.id}>
                  {opco.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-zinc-600">Partner</span>
            <select
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="">All</option>
              {filterOptions.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-zinc-600">Missing</span>
            <select
              value={missing}
              onChange={(event) =>
                setMissing(event.target.value as MissingSideFilter | "")
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="any">Any side</option>
              <option value="opco">OpCo report</option>
              <option value="partner">Partner report</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void loadData(1)}
          disabled={loading}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Apply filters
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Linked lanes</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {result.summary.linkedLanes}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">OpCo missing</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {result.summary.opcoMissing}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Partner missing</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {result.summary.partnerMissing}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Selected lanes</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {selectedLaneKeys.length || "All"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {selectedLaneKeys.length === 0
              ? "Empty selection sends to all missing lanes"
              : "Only selected lanes"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-zinc-900">Report lanes</h2>
            <button
              type="button"
              onClick={selectMissingOnPage}
              className="text-sm font-medium text-zinc-700 underline"
            >
              Select missing on page
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium" />
                  <th className="px-3 py-2 font-medium">Lane</th>
                  <th className="px-3 py-2 font-medium">OpCo report</th>
                  <th className="px-3 py-2 font-medium">Partner report</th>
                </tr>
              </thead>
              <tbody>
                {result.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                      No lanes match the selected filters.
                    </td>
                  </tr>
                ) : (
                  result.items.map((lane) => (
                    <tr key={lane.laneKey} className="border-b border-zinc-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedLaneKeys.includes(lane.laneKey)}
                          onChange={() => toggleLane(lane.laneKey)}
                          className="rounded border-zinc-300"
                        />
                      </td>
                      <td className="px-3 py-2 text-zinc-900">
                        {lane.opcoName} / {lane.partnerName}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            lane.opcoReport.status === "Missing"
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }
                        >
                          {lane.opcoReport.status}
                        </span>
                        {lane.opcoReport.uploadedAt ? (
                          <div className="text-xs text-zinc-500">
                            {formatDateTime(lane.opcoReport.uploadedAt)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            lane.partnerReport.status === "Missing"
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }
                        >
                          {lane.partnerReport.status}
                        </span>
                        {lane.partnerReport.uploadedAt ? (
                          <div className="text-xs text-zinc-500">
                            {formatDateTime(lane.partnerReport.uploadedAt)}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {result.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
              <span>
                Page {result.page} of {result.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={result.page <= 1 || loading}
                  onClick={() => void loadData(result.page - 1)}
                  className="rounded-lg border border-zinc-300 px-3 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={result.page >= result.totalPages || loading}
                  onClick={() => void loadData(result.page + 1)}
                  className="rounded-lg border border-zinc-300 px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-medium text-zinc-900">Reminder message</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Edit before sending. Defaults from REPORT_REMINDER template.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="text-zinc-600">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={255}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="text-zinc-600">Body</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={8}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void sendReminders("opco")}
                disabled={sending}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send OpCo reminders"}
              </button>
              <button
                type="button"
                onClick={() => void sendReminders("partner")}
                disabled={sending}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send Partner reminders"}
              </button>
              <button
                type="button"
                onClick={() => void sendReminders("both")}
                disabled={sending}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send both"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
