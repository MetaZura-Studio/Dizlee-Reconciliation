"use client";

import { formatAppDateTime } from "@/lib/platform/format-datetime";
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
  attachmentFileIds,
  NotificationAttachmentPicker,
  type PendingAttachment,
} from "@/components/shared/notification-attachment-picker";
import {
  DEFAULT_REMINDER_MESSAGE_SOURCE,
  type BroadcastTemplateOption,
} from "@/lib/dizlee/notifications/broadcast.shared";
import type {
  LaneNotificationHistoryItem,
  LaneNotificationHistoryResult,
} from "@/lib/dizlee/lane-report-notifications";
import type { CompareLaneRow } from "@/lib/dizlee/reconciliation";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

type LaneRemindModalProps = {
  lane: CompareLaneRow;
  month: number;
  year: number;
  onClose: () => void;
  onSent: (message: string) => void;
};

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
  code: string,
) {
  const template = templates.find((row) => row.code === code);
  return {
    subject: template?.subject ?? "",
    body: template?.body ?? "",
  };
}

function hasAnyNotice(history: LaneNotificationHistoryResult): boolean {
  const { summary, items } = history;
  return (
    items.length > 0 ||
    Boolean(
      summary.lastOpcoReminderAt ||
        summary.lastOpcoIntimationAt ||
        summary.lastPartnerReminderAt ||
        summary.lastPartnerIntimationAt,
    )
  );
}

function missingReasonLabel(side: "opco" | "partner", lane: CompareLaneRow): string {
  if (side === "opco") {
    if (lane.state === "MISSING" || lane.state === "NO_OPCO_REPORT") {
      return "report missing";
    }
    return "already submitted";
  }
  if (lane.state === "MISSING" || lane.state === "NO_PARTNER_REPORT") {
    return "report missing";
  }
  return "already submitted";
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
  const [messageSource, setMessageSource] = useState<string>(
    DEFAULT_REMINDER_MESSAGE_SOURCE,
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

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
          throw new Error(formatAppError(payload, "Failed to load reminder history"));
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

  function handleTemplateChange(code: string) {
    setMessageSource(code);
    if (history) {
      const content = getTemplateContent(history.templates, code);
      setSubject(content.subject);
      setBody(content.body);
    }
  }

  async function sendReminder(target: "opco" | "partner" | "both") {
    if (sending) {
      return;
    }
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
          attachmentFileIds: attachmentFileIds(attachments),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to send reminder"));
      }

      const message =
        (payload.data?.message as string | undefined) ?? "Reminder sent.";
      onSent(message);
      setAttachments([]);

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

  const periodLabel = history?.periodLabel ?? `${month}/${year}`;
  const noticesSent = history ? hasAnyNotice(history) : false;

  const opcoButtonLabel = canRemindOpco
    ? `Remind OpCo (${missingReasonLabel("opco", lane)})`
    : "Remind OpCo";
  const partnerButtonLabel = canRemindPartner
    ? `Remind Partner (${missingReasonLabel("partner", lane)})`
    : "Remind Partner";
  const bothButtonLabel =
    canRemindOpco && canRemindPartner
      ? "Remind both (reports missing)"
      : "Remind both";

  function renderCompose() {
    if (!history) {
      return null;
    }

    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface-muted/40 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Send a new reminder
          </h3>
          <p className="mt-1 text-xs text-foreground-subtle">
            Placeholders like {"{{period}}"} are filled automatically when the
            email is sent.
          </p>
        </div>
        <FilterToolbar className="flex-col items-stretch">
          <div>
            <FieldLabel htmlFor="lane-remind-template">Template</FieldLabel>
            <Select
              id="lane-remind-template"
              value={messageSource}
              onChange={(event) => handleTemplateChange(event.target.value)}
              disabled={sending}
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
              disabled={sending}
            />
          </div>
          <div>
            <FieldLabel htmlFor="lane-remind-body">Body</FieldLabel>
            <textarea
              id="lane-remind-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              disabled={sending}
              className={`${ui.input} h-auto resize-y py-2.5 disabled:opacity-60`}
            />
          </div>
          <NotificationAttachmentPicker
            attachments={attachments}
            onChange={setAttachments}
            disabled={sending}
          />
        </FilterToolbar>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={sending || !canRemindOpco}
            title={
              canRemindOpco
                ? undefined
                : "OpCo report is already on file for this period"
            }
            onClick={() => void sendReminder("opco")}
          >
            {opcoButtonLabel}
          </Button>
          <Button
            variant="secondary"
            disabled={sending || !canRemindPartner}
            title={
              canRemindPartner
                ? undefined
                : "Partner report is already on file for this period"
            }
            onClick={() => void sendReminder("partner")}
          >
            {partnerButtonLabel}
          </Button>
          <Button
            disabled={sending || (!canRemindOpco && !canRemindPartner)}
            onClick={() => void sendReminder("both")}
          >
            {sending ? "Sending…" : bothButtonLabel}
          </Button>
        </div>
      </div>
    );
  }

  function renderStatus() {
    if (!history) {
      return null;
    }

    if (!noticesSent) {
      return (
        <div className="rounded-lg border border-border px-4 py-3 text-sm text-foreground-muted">
          Neither side has been reminded for{" "}
          <span className="font-medium text-foreground">{periodLabel}</span> yet.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-xs text-foreground-subtle">
          <span className="font-medium text-foreground-muted">Reminder</span> —
          asks for a missing report.{" "}
          <span className="font-medium text-foreground-muted">Intimation</span> —
          notifies that the other side already submitted.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="text-xs font-medium text-foreground">{lane.opcoName}</p>
            <p className="mt-2 text-xs text-foreground-subtle">Last reminder</p>
            <p className="font-medium text-foreground">
              {formatAppDateTime(history.summary.lastOpcoReminderAt)}
            </p>
            <p className="mt-2 text-xs text-foreground-subtle">Last intimation</p>
            <p className="font-medium text-foreground">
              {formatAppDateTime(history.summary.lastOpcoIntimationAt)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="text-xs font-medium text-foreground">
              {lane.partnerName}
            </p>
            <p className="mt-2 text-xs text-foreground-subtle">Last reminder</p>
            <p className="font-medium text-foreground">
              {formatAppDateTime(history.summary.lastPartnerReminderAt)}
            </p>
            <p className="mt-2 text-xs text-foreground-subtle">Last intimation</p>
            <p className="font-medium text-foreground">
              {formatAppDateTime(history.summary.lastPartnerIntimationAt)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderHistory() {
    if (!history || !noticesSent) {
      return null;
    }

    return (
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
                    <DataTableTh align="center">Sent</DataTableTh>
                    <DataTableTh>Type</DataTableTh>
                    <DataTableTh>To</DataTableTh>
                    <DataTableTh>Subject</DataTableTh>
                    <DataTableTh>By</DataTableTh>
                  </DataTableRow>
                </DataTableHead>
                <tbody>
                  {history.items.map((item) => (
                    <DataTableRow key={item.id}>
                      <DataTableTd className="text-foreground-muted" align="center">
                        {formatAppDateTime(item.sentAt)}
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
            Summary timestamps exist, but no detailed history rows for{" "}
            {periodLabel}.
          </p>
        )}
      </div>
    );
  }

  return (
    <Modal
      open
      title="Remind to submit reports"
      onClose={onClose}
      wide
      className="!max-w-6xl w-[min(96vw,72rem)] !max-h-[94vh]"
    >
      <p className="mb-6 text-sm text-foreground-muted">
        {lane.opcoName} / {lane.partnerName} · {periodLabel}
      </p>

      <div className="space-y-6">
        {loading ? (
          <p className="text-sm text-foreground-subtle">Loading history…</p>
        ) : null}

        {error ? <p className={ui.alertError}>{error}</p> : null}

        {history ? (
          noticesSent ? (
            <>
              {renderStatus()}
              {renderHistory()}
              {renderCompose()}
            </>
          ) : (
            <>
              {renderCompose()}
              {renderStatus()}
            </>
          )
        ) : null}
      </div>
    </Modal>
  );
}
