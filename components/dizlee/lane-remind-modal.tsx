"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_REMINDER_MESSAGE_SOURCE,
  type BroadcastTemplateCode,
  type BroadcastTemplateOption,
} from "@/lib/dizlee/notifications/broadcast.shared";
import type {
  LaneNotificationHistoryItem,
  LaneNotificationHistoryResult,
} from "@/lib/dizlee/lane-report-notifications";
import type { CompareLaneRow } from "@/lib/dizlee/reconciliation";

type LaneRemindModalProps = {
  lane: CompareLaneRow;
  month: number;
  year: number;
  onClose: () => void;
  onSent: (message: string) => void;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never";
  }
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function kindLabel(kind: LaneNotificationHistoryItem["kind"]): string {
  switch (kind) {
    case "reminder":
      return "Reminder";
    case "intimation":
      return "Intimation";
    default:
      return "Notification";
  }
}

function getTemplateContent(
  templates: BroadcastTemplateOption[],
  code: BroadcastTemplateCode,
) {
  const template = templates.find((row) => row.code === code);
  return {
    subject: template?.subject ?? "",
    body: template?.body ?? "",
  };
}

export function LaneRemindModal({
  lane,
  month,
  year,
  onClose,
  onSent,
}: LaneRemindModalProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LaneNotificationHistoryResult | null>(
    null,
  );
  const [messageSource, setMessageSource] = useState<BroadcastTemplateCode>(
    DEFAULT_REMINDER_MESSAGE_SOURCE,
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const canRemindOpco =
    lane.state === "MISSING" || lane.state === "NO_OPCO_REPORT";
  const canRemindPartner =
    lane.state === "MISSING" || lane.state === "NO_PARTNER_REPORT";

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          opcoId: lane.opcoId,
          partnerId: lane.partnerId,
          month: String(month),
          year: String(year),
        });
        const response = await fetch(
          `/api/dizlee/reconciliation/lane-notifications?${params.toString()}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load reminder history");
        }
        if (cancelled) {
          return;
        }
        const data = payload.data as LaneNotificationHistoryResult;
        setHistory(data);
        const content = getTemplateContent(
          data.templates,
          DEFAULT_REMINDER_MESSAGE_SOURCE,
        );
        setSubject(content.subject);
        setBody(content.body);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load reminder history",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [lane.opcoId, lane.partnerId, month, year]);

  function handleTemplateChange(code: BroadcastTemplateCode) {
    setMessageSource(code);
    if (history) {
      const content = getTemplateContent(history.templates, code);
      setSubject(content.subject);
      setBody(content.body);
    }
  }

  async function sendReminder(target: "opco" | "partner" | "both") {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/dizlee/notifications/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          laneKeys: [`${lane.opcoId}-${lane.partnerId}`],
          target,
          messageSource,
          subject,
          body,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send reminder");
      }

      const message =
        (payload.data?.message as string | undefined) ?? "Reminder sent.";
      onSent(message);

      const refresh = await fetch(
        `/api/dizlee/reconciliation/lane-notifications?${new URLSearchParams({
          opcoId: lane.opcoId,
          partnerId: lane.partnerId,
          month: String(month),
          year: String(year),
        }).toString()}`,
      );
      const refreshPayload = await refresh.json();
      if (refresh.ok) {
        setHistory(refreshPayload.data as LaneNotificationHistoryResult);
      }
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send reminder",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lane-remind-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2
              id="lane-remind-title"
              className="text-lg font-semibold text-foreground"
            >
              Remind to submit reports
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              {lane.opcoName} / {lane.partnerName} ·{" "}
              {history?.periodLabel ?? `${month}/${year}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-foreground-subtle hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <p className="text-sm text-foreground-subtle">Loading history…</p>
          ) : null}

          {error ? (
            <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {history ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs text-foreground-subtle">Last OpCo reminder</p>
                  <p className="font-medium text-foreground">
                    {formatDateTime(history.summary.lastOpcoReminderAt)}
                  </p>
                  <p className="mt-2 text-xs text-foreground-subtle">
                    Last OpCo intimation
                  </p>
                  <p className="font-medium text-foreground">
                    {formatDateTime(history.summary.lastOpcoIntimationAt)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs text-foreground-subtle">
                    Last Partner reminder
                  </p>
                  <p className="font-medium text-foreground">
                    {formatDateTime(history.summary.lastPartnerReminderAt)}
                  </p>
                  <p className="mt-2 text-xs text-foreground-subtle">
                    Last Partner intimation
                  </p>
                  <p className="font-medium text-foreground">
                    {formatDateTime(history.summary.lastPartnerIntimationAt)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Previous intimations & reminders
                </h3>
                {history.items.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-border">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-surface-muted text-left text-foreground-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">Sent</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">To</th>
                          <th className="px-3 py-2 font-medium">Subject</th>
                          <th className="px-3 py-2 font-medium">By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {history.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-foreground-muted">
                              {formatDateTime(item.sentAt)}
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              {kindLabel(item.kind)}
                            </td>
                            <td className="px-3 py-2 text-foreground-muted">
                              {item.recipientName} (
                              {item.recipientSide === "opco" ? "OpCo" : "Partner"})
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              <p>{item.subject}</p>
                              <p className="text-xs text-foreground-subtle">
                                {item.bodyPreview}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-foreground-muted">
                              {item.sentBy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-foreground-subtle">
                    No previous intimations or reminders found for this pair in{" "}
                    {history.periodLabel}.
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Send a new reminder
                </h3>
                <label className="block text-sm">
                  <span className="text-foreground-muted">Template</span>
                  <select
                    value={messageSource}
                    onChange={(event) =>
                      handleTemplateChange(
                        event.target.value as BroadcastTemplateCode,
                      )
                    }
                    className="mt-1 w-full rounded border border-border-strong px-3 py-2"
                  >
                    {history.templates.map((template) => (
                      <option key={template.code} value={template.code}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-foreground-muted">Subject</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    maxLength={255}
                    className="mt-1 w-full rounded border border-border-strong px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-foreground-muted">Body</span>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={5}
                    className="mt-1 w-full rounded border border-border-strong px-3 py-2"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={sending || !canRemindOpco}
                    onClick={() => void sendReminder("opco")}
                    className="rounded border border-border-strong px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
                  >
                    Remind OpCo
                  </button>
                  <button
                    type="button"
                    disabled={sending || !canRemindPartner}
                    onClick={() => void sendReminder("partner")}
                    className="rounded border border-border-strong px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
                  >
                    Remind Partner
                  </button>
                  <button
                    type="button"
                    disabled={sending || (!canRemindOpco && !canRemindPartner)}
                    onClick={() => void sendReminder("both")}
                    className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
                  >
                    {sending ? "Sending…" : "Remind both"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
