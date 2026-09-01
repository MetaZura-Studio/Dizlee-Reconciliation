"use client";

import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel, FieldLegend, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { FilterToolbar } from "@/components/ui/page";
import {
  attachmentFileIds,
  NotificationAttachmentPicker,
  type PendingAttachment,
} from "@/components/shared/notification-attachment-picker";
import {
  DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
  DEFAULT_REMINDER_MESSAGE_SOURCE,
  type BroadcastTemplateOption,
  type NotificationDeliveryChannel,
} from "@/lib/dizlee/notifications/broadcast.shared";
import type {
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

const DELIVERY_OPTIONS: Array<{
  value: NotificationDeliveryChannel;
  label: string;
  hint: string;
}> = [
  {
    value: "SYSTEM",
    label: "System notification",
    hint: "In-app inbox and bell only",
  },
  {
    value: "EMAIL",
    label: "Email notification",
    hint: "Email only (still logged in Outbox)",
  },
  {
    value: "BOTH",
    label: "Both",
    hint: "In-app inbox plus email",
  },
];

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
  const [deliveryChannel, setDeliveryChannel] =
    useState<NotificationDeliveryChannel>(DEFAULT_NOTIFICATION_DELIVERY_CHANNEL);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [target, setTarget] = useState<"opco" | "partner" | "both">(() => {
    const canOpco =
      lane.state === "MISSING" || lane.state === "NO_OPCO_REPORT";
    const canPartner =
      lane.state === "MISSING" || lane.state === "NO_PARTNER_REPORT";
    if (canOpco && canPartner) return "both";
    if (canOpco) return "opco";
    if (canPartner) return "partner";
    return "both";
  });

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
          deliveryChannel,
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
  const canSendSelected =
    (target === "opco" && canRemindOpco) ||
    (target === "partner" && canRemindPartner) ||
    (target === "both" && (canRemindOpco || canRemindPartner));

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
            Placeholders like {"{{period}}"} are filled automatically. Choose
            System, Email, or Both for delivery.
          </p>
        </div>
        <FilterToolbar className="flex-col items-stretch">
          <fieldset className="space-y-2">
            <FieldLegend required>Delivery method</FieldLegend>
            <div className="grid gap-3 sm:grid-cols-3">
              {DELIVERY_OPTIONS.map((option) => {
                const selected = deliveryChannel === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex h-full cursor-pointer items-start gap-3 rounded-xl border bg-surface p-3 text-sm shadow-[var(--shadow-sm)] transition-colors ${
                      selected
                        ? "border-primary ring-2 ring-[var(--ring)]"
                        : "border-border hover:border-border-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="laneRemindDeliveryChannel"
                      value={option.value}
                      checked={selected}
                      onChange={() => setDeliveryChannel(option.value)}
                      className="mt-1 shrink-0"
                      disabled={sending}
                    />
                    <span>
                      <span className="font-medium text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-foreground-subtle">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
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
          <fieldset className="space-y-2">
            <FieldLegend required>Send to</FieldLegend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    value: "opco" as const,
                    label: "OpCo",
                    hint: missingReasonLabel("opco", lane),
                    enabled: canRemindOpco,
                  },
                  {
                    value: "partner" as const,
                    label: "Partner",
                    hint: missingReasonLabel("partner", lane),
                    enabled: canRemindPartner,
                  },
                  {
                    value: "both" as const,
                    label: "Both",
                    hint:
                      canRemindOpco && canRemindPartner
                        ? "reports missing"
                        : "only missing sides",
                    enabled: canRemindOpco || canRemindPartner,
                  },
                ] as const
              ).map((option) => {
                const selected = target === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-surface px-3 py-2.5 text-sm shadow-[var(--shadow-sm)] transition-colors ${
                      !option.enabled
                        ? "cursor-not-allowed border-border opacity-50 shadow-none"
                        : selected
                          ? "border-primary ring-2 ring-[var(--ring)]"
                          : "border-border hover:border-border-strong"
                    }`}
                    title={
                      option.enabled
                        ? undefined
                        : `${option.label} report is already on file for this period`
                    }
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <input
                        type="radio"
                        name="laneRemindTarget"
                        value={option.value}
                        checked={selected}
                        onChange={() => setTarget(option.value)}
                        disabled={sending || !option.enabled}
                      />
                      {option.label}
                    </span>
                    <span className="pl-6 text-xs text-foreground-subtle">
                      {option.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </FilterToolbar>
        <Button
          className="w-full sm:w-auto sm:min-w-[10rem]"
          disabled={sending || !canSendSelected}
          onClick={() => void sendReminder(target)}
        >
          {sending ? "Sending…" : "Send"}
        </Button>
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
          <p className="text-sm text-foreground-subtle">Loading…</p>
        ) : null}

        {error ? <p className={ui.alertError}>{error}</p> : null}

        {history ? (
          <>
            {renderCompose()}
            {renderStatus()}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
