"use client";

import { useCallback, useMemo, useState } from "react";

import { NotificationsTabs } from "@/components/dizlee/notifications-tabs";
import type {
  BroadcastAudience,
  BroadcastMessageSource,
  IntimationFormOptions,
  IntimationListResult,
} from "@/lib/dizlee/notifications/broadcast.shared";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";

const PRIORITY_OPTIONS = [
  { value: "", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "LOW", label: "Low" },
];

const AUDIENCE_OPTIONS: Array<{ value: BroadcastAudience; label: string }> = [
  { value: "opco", label: "OpCo" },
  { value: "partner", label: "Partner" },
  { value: "both", label: "Both (OpCo + Partner)" },
];

const MESSAGE_SOURCE_OPTIONS: Array<{
  value: BroadcastMessageSource;
  label: string;
}> = [
  { value: "custom", label: "Custom message" },
  { value: "REPORT_SUBMISSION", label: "Report submission" },
  { value: "REPORT_REMINDER", label: "Report reminder" },
  { value: "INVOICE_SUBMISSION", label: "Invoice submission" },
  { value: "INVOICE_REMINDER", label: "Invoice reminder" },
];

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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function currentPeriodDefaults() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

type IntimationsViewProps = {
  initialResult: IntimationListResult;
  initialFormOptions: IntimationFormOptions;
};

export function IntimationsView({
  initialResult,
  initialFormOptions,
}: IntimationsViewProps) {
  const [result, setResult] = useState(initialResult);
  const [formOptions, setFormOptions] =
    useState<IntimationFormOptions>(initialFormOptions);

  const [audience, setAudience] = useState<BroadcastAudience>("opco");
  const [messageSource, setMessageSource] =
    useState<BroadcastMessageSource>("custom");
  const [month, setMonth] = useState(currentPeriodDefaults().month);
  const [year, setYear] = useState(currentPeriodDefaults().year);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedOpcoIds, setSelectedOpcoIds] = useState<string[]>([]);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const showOpcos = audience === "opco" || audience === "both";
  const showPartners = audience === "partner" || audience === "both";
  const usingTemplate = messageSource !== "custom";

  const sendLabel = useMemo(() => {
    if (sending) {
      return "Sending…";
    }
    if (audience === "opco") {
      return "Send to OpCos";
    }
    if (audience === "partner") {
      return "Send to Partners";
    }
    return "Send to all selected";
  }, [audience, sending]);

  const canSend = useMemo(() => {
    const hasSubjectAndBody = subject.trim().length > 0 && body.trim().length > 0;
    const hasRecipients =
      (showOpcos && selectedOpcoIds.length > 0) ||
      (showPartners && selectedPartnerIds.length > 0);

    if (!hasRecipients) {
      return false;
    }

    if (usingTemplate) {
      return true;
    }

    return hasSubjectAndBody;
  }, [
    body,
    selectedOpcoIds.length,
    selectedPartnerIds.length,
    showOpcos,
    showPartners,
    subject,
    usingTemplate,
  ]);

  const loadList = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/notifications/intimations?page=${page}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load intimations");
      }
      setResult(payload.data as IntimationListResult);
      if (payload.formOptions) {
        setFormOptions(payload.formOptions as IntimationFormOptions);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load intimations",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyTemplate = (source: BroadcastMessageSource) => {
    if (source === "custom") {
      setSubject("");
      setBody("");
      return;
    }

    const template = formOptions.templates.find((row) => row.code === source);
    if (!template) {
      return;
    }

    const defaults = currentPeriodDefaults();
    setMonth(defaults.month);
    setYear(defaults.year);
    setSubject(template.subject);
    setBody(template.body);
  };

  const handleMessageSourceChange = (source: BroadcastMessageSource) => {
    setMessageSource(source);
    applyTemplate(source);
  };

  const toggleOpco = (opcoId: string) => {
    setSelectedOpcoIds((current) =>
      current.includes(opcoId)
        ? current.filter((id) => id !== opcoId)
        : [...current, opcoId],
    );
  };

  const togglePartner = (partnerId: string) => {
    setSelectedPartnerIds((current) =>
      current.includes(partnerId)
        ? current.filter((id) => id !== partnerId)
        : [...current, partnerId],
    );
  };

  const sendIntimation = async () => {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/dizlee/notifications/intimations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          messageSource,
          month: usingTemplate ? month : undefined,
          year: usingTemplate ? year : undefined,
          subject,
          body,
          opcoIds: showOpcos ? selectedOpcoIds : [],
          partnerIds: showPartners ? selectedPartnerIds : [],
          priority: priority || null,
          expiresAt: expiresAt || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send notification");
      }

      setMessage(payload.data.message as string);
      setSubject("");
      setBody("");
      setPriority("");
      setExpiresAt("");
      setMessageSource("custom");
      setSelectedOpcoIds([]);
      setSelectedPartnerIds([]);
      await loadList(1);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send notification",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-foreground-subtle">
          Send in-app messages to OpCos and/or Partners.
        </p>
      </div>

      <NotificationsTabs active="intimations" />

      {error ? (
        <div className="rounded-lg border border-danger-border bg-danger-muted px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-success-border bg-success-muted px-4 py-3 text-sm text-success">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-medium text-foreground">Compose intimation</h2>
          <p className="mt-1 text-sm text-foreground-subtle">
            Delivered to the selected recipients&apos; notification inboxes.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="text-foreground-muted">Audience</span>
              <select
                value={audience}
                onChange={(event) =>
                  setAudience(event.target.value as BroadcastAudience)
                }
                className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-foreground-muted">Message source</span>
              <select
                value={messageSource}
                onChange={(event) =>
                  handleMessageSourceChange(
                    event.target.value as BroadcastMessageSource,
                  )
                }
                className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
              >
                {MESSAGE_SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {usingTemplate ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-foreground-muted">Month</span>
                  <select
                    value={month}
                    onChange={(event) => setMonth(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                  >
                    {MONTHS.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="text-foreground-muted">Year</span>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={year}
                    onChange={(event) => setYear(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                  />
                </label>
              </div>
            ) : null}

            <label className="block text-sm">
              <span className="text-foreground-muted">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={255}
                className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                placeholder="Monthly reporting reminder"
              />
            </label>

            <label className="block text-sm">
              <span className="text-foreground-muted">Message</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={6}
                className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                placeholder="Please submit partner reports for the current period by end of week."
              />
            </label>

            {usingTemplate ? (
              <p className="text-xs text-foreground-subtle">
                Placeholder {"{{period}}"} is filled from the month and year above.
                You can edit the text before sending.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-foreground-muted">Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value || "normal"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-foreground-muted">Expires (optional)</span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                />
              </label>
            </div>

            {showOpcos ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground-muted">
                    Recipients (OpCos)
                  </span>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOpcoIds(
                          formOptions.opcos.map((opco) => opco.id),
                        )
                      }
                      className="font-medium text-foreground-muted underline"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOpcoIds([])}
                      className="font-medium text-foreground-muted underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {formOptions.opcos.length === 0 ? (
                    <p className="text-sm text-foreground-subtle">
                      No OpCos configured.
                    </p>
                  ) : (
                    formOptions.opcos.map((opco) => (
                      <label
                        key={opco.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOpcoIds.includes(opco.id)}
                          onChange={() => toggleOpco(opco.id)}
                          className="rounded border-border-strong"
                        />
                        {opco.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {showPartners ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground-muted">
                    Recipients (Partners)
                  </span>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPartnerIds(
                          formOptions.partners.map((partner) => partner.id),
                        )
                      }
                      className="font-medium text-foreground-muted underline"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPartnerIds([])}
                      className="font-medium text-foreground-muted underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {formOptions.partners.length === 0 ? (
                    <p className="text-sm text-foreground-subtle">
                      No Partners configured.
                    </p>
                  ) : (
                    formOptions.partners.map((partner) => (
                      <label
                        key={partner.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPartnerIds.includes(partner.id)}
                          onChange={() => togglePartner(partner.id)}
                          className="rounded border-border-strong"
                        />
                        {partner.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void sendIntimation()}
              disabled={sending || !canSend}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {sendLabel}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-medium text-foreground">Recent intimations</h2>
          <p className="mt-1 text-sm text-foreground-subtle">
            Notifications sent to OpCos and Partners from Dizlee.
          </p>

          <div className="mt-4 space-y-3">
            {result.items.length === 0 ? (
              <p className="text-sm text-foreground-subtle">No intimations sent yet.</p>
            ) : (
              result.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-border bg-surface-muted p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground">{item.subject}</h3>
                    {item.priority ? (
                      <span className="rounded-full bg-primary-muted px-2 py-0.5 text-xs text-foreground-muted">
                        {item.priority}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-foreground-muted">{item.bodyPreview}</p>
                  <p className="mt-2 text-xs text-foreground-subtle">
                    To: {item.recipientSummary || `${item.recipientCount} recipient(s)`}
                  </p>
                  <p className="mt-1 text-xs text-foreground-subtle">
                    {formatDateTime(item.sentAt)} · {item.sentBy}
                  </p>
                </article>
              ))
            )}
          </div>

          {result.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-foreground-muted">
              <span>
                Page {result.page} of {result.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={result.page <= 1 || loading}
                  onClick={() => void loadList(result.page - 1)}
                  className="rounded-lg border border-border-strong px-3 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={result.page >= result.totalPages || loading}
                  onClick={() => void loadList(result.page + 1)}
                  className="rounded-lg border border-border-strong px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
