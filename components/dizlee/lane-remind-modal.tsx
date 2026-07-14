"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { FilterToolbar } from "@/components/ui/page";
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
import { ui } from "@/lib/ui/classes";

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
    <Modal
      open
      title="Remind to submit reports"
      onClose={onClose}
      wide
      className="max-w-3xl"
    >
      <p className="mb-6 text-sm text-foreground-muted">
        {lane.opcoName} / {lane.partnerName} ·{" "}
        {history?.periodLabel ?? `${month}/${year}`}
      </p>

      <div className="space-y-6">
        {loading ? (
          <p className="text-sm text-foreground-subtle">Loading history…</p>
        ) : null}

        {error ? <p className={ui.alertError}>{error}</p> : null}

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
                <div className="mt-3">
                  <DataTableFrame>
                    <DataTable>
                      <DataTableHead>
                        <DataTableRow>
                          <DataTableTh>Sent</DataTableTh>
                          <DataTableTh>Type</DataTableTh>
                          <DataTableTh>To</DataTableTh>
                          <DataTableTh>Subject</DataTableTh>
                          <DataTableTh>By</DataTableTh>
                        </DataTableRow>
                      </DataTableHead>
                      <tbody>
                        {history.items.map((item) => (
                          <DataTableRow key={item.id}>
                            <DataTableTd className="text-foreground-muted">
                              {formatDateTime(item.sentAt)}
                            </DataTableTd>
                            <DataTableTd>{kindLabel(item.kind)}</DataTableTd>
                            <DataTableTd className="text-foreground-muted">
                              {item.recipientName} (
                              {item.recipientSide === "opco" ? "OpCo" : "Partner"})
                            </DataTableTd>
                            <DataTableTd>
                              <p>{item.subject}</p>
                              <p className="text-xs text-foreground-subtle">
                                {item.bodyPreview}
                              </p>
                            </DataTableTd>
                            <DataTableTd className="text-foreground-muted">
                              {item.sentBy}
                            </DataTableTd>
                          </DataTableRow>
                        ))}
                      </tbody>
                    </DataTable>
                  </DataTableFrame>
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
              <FilterToolbar className="flex-col items-stretch">
                <div>
                  <FieldLabel htmlFor="lane-remind-template">Template</FieldLabel>
                  <Select
                    id="lane-remind-template"
                    value={messageSource}
                    onChange={(event) =>
                      handleTemplateChange(
                        event.target.value as BroadcastTemplateCode,
                      )
                    }
                  >
                    {history.templates.map((template) => (
                      <option key={template.code} value={template.code}>
                        {template.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="lane-remind-subject">Subject</FieldLabel>
                  <Input
                    id="lane-remind-subject"
                    type="text"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    maxLength={255}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="lane-remind-body">Body</FieldLabel>
                  <textarea
                    id="lane-remind-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={5}
                    className={`${ui.input} h-auto resize-y py-2.5`}
                  />
                </div>
              </FilterToolbar>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={sending || !canRemindOpco}
                  onClick={() => void sendReminder("opco")}
                >
                  Remind OpCo
                </Button>
                <Button
                  variant="secondary"
                  disabled={sending || !canRemindPartner}
                  onClick={() => void sendReminder("partner")}
                >
                  Remind Partner
                </Button>
                <Button
                  disabled={sending || (!canRemindOpco && !canRemindPartner)}
                  onClick={() => void sendReminder("both")}
                >
                  {sending ? "Sending…" : "Remind both"}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
