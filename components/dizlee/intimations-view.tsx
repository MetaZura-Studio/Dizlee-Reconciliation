/**
 * Compose and send submission intimation emails to OpCos and partners.
 * Uses DB-backed templates from the intimations category.
 * Sent history lives under Communications → Outbox.
 */

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CommunicationsTabs } from "@/components/dizlee/communications-tabs";
import {
  attachmentFileIds,
  NotificationAttachmentPicker,
  type PendingAttachment,
} from "@/components/shared/notification-attachment-picker";
import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
import { PageCard, PageHeader } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import { cn, ui } from "@/lib/ui/classes";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import type {
  BroadcastAudience,
  BroadcastMessageSource,
  IntimationFormOptions,
  NotificationDeliveryChannel,
} from "@/lib/dizlee/notifications/broadcast.shared";
import { DEFAULT_NOTIFICATION_DELIVERY_CHANNEL } from "@/lib/dizlee/notifications/broadcast.shared";
import { formatAppError } from "@/lib/errors/format";

const PRIORITY_OPTIONS = [
  { value: "", label: "Normal" },
  { value: "HIGH", label: "High" },
];

const AUDIENCE_OPTIONS: Array<{ value: BroadcastAudience; label: string }> = [
  { value: "opco", label: "OpCo" },
  { value: "partner", label: "Partner" },
  { value: "both", label: "Both (OpCo + Partner)" },
];

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

const MESSAGE_SOURCE_OPTIONS: Array<{
  value: BroadcastMessageSource;
  label: string;
}> = [
  { value: "custom", label: "Custom message" },
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

function currentPeriodDefaults() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

type IntimationsViewProps = {
  initialFormOptions: IntimationFormOptions;
};

export function IntimationsView({
  initialFormOptions,
}: IntimationsViewProps) {
  const [formOptions] = useState<IntimationFormOptions>(initialFormOptions);

  const [audience, setAudience] = useState<BroadcastAudience>("opco");
  const [deliveryChannel, setDeliveryChannel] =
    useState<NotificationDeliveryChannel>(DEFAULT_NOTIFICATION_DELIVERY_CHANNEL);
  const [messageSource, setMessageSource] =
    useState<BroadcastMessageSource>("custom");
  const [month, setMonth] = useState(currentPeriodDefaults().month);
  const [year, setYear] = useState(currentPeriodDefaults().year);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("");
  const [selectedOpcoIds, setSelectedOpcoIds] = useState<string[]>([]);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const showOpcos = audience === "opco" || audience === "both";
  const showPartners = audience === "partner" || audience === "both";
  const usingTemplate = messageSource !== "custom";

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

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

  const recipientSummary = useMemo(() => {
    const parts: string[] = [];
    if (showOpcos && selectedOpcoIds.length > 0) {
      parts.push(
        `${selectedOpcoIds.length} OpCo${selectedOpcoIds.length === 1 ? "" : "s"}`,
      );
    }
    if (showPartners && selectedPartnerIds.length > 0) {
      parts.push(
        `${selectedPartnerIds.length} Partner${selectedPartnerIds.length === 1 ? "" : "s"}`,
      );
    }
    return parts.length > 0 ? parts.join(" · ") : "No recipients selected";
  }, [
    selectedOpcoIds.length,
    selectedPartnerIds.length,
    showOpcos,
    showPartners,
  ]);

  const deliveryLabel =
    DELIVERY_OPTIONS.find((option) => option.value === deliveryChannel)?.label ??
    deliveryChannel;

  const sendIntimation = async () => {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/dizlee/notifications/intimations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          deliveryChannel,
          messageSource,
          month: usingTemplate ? month : undefined,
          year: usingTemplate ? year : undefined,
          subject,
          body,
          opcoIds: showOpcos ? selectedOpcoIds : [],
          partnerIds: showPartners ? selectedPartnerIds : [],
          priority: priority === "HIGH" ? "HIGH" : null,
          attachmentFileIds: attachmentFileIds(attachments),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to send notification"));
      }

      toast.success(payload.data.message as string);
      setSubject("");
      setBody("");
      setPriority("");
      setMessageSource("custom");
      setSelectedOpcoIds([]);
      setSelectedPartnerIds([]);
      setAttachments([]);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send notification",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <PageCard>
      <PageHeader
        title="Communications"
        description="Send messages to OpCos and/or Partners via in-app, email, or both."
      />

      <CommunicationsTabs active="intimations" />

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">
              Compose intimation
            </h2>
            <p className="mt-1 text-sm text-foreground-subtle">
              Message first, then delivery and recipients. Sent items appear in
              Outbox.
            </p>
          </div>
          <Link
            href="/dizlee/communications?tab=outbox"
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            View Outbox
          </Link>
        </div>

        <div className="mt-5 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Message</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <FieldLegend required>Message source</FieldLegend>
                <select
                  value={messageSource}
                  onChange={(event) =>
                    handleMessageSourceChange(
                      event.target.value as BroadcastMessageSource,
                    )
                  }
                  className={ui.select}
                >
                  {MESSAGE_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {formOptions.templates.map((template) => (
                    <option key={template.code} value={template.code}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className={ui.label}>Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className={ui.select}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option
                      key={option.value || "normal"}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {usingTemplate ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <FieldLegend required>Month</FieldLegend>
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

                <label className="block text-sm">
                  <FieldLegend required>Year</FieldLegend>
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
              </div>
            ) : null}

            <label className="block text-sm">
              <FieldLegend required={!usingTemplate}>Subject</FieldLegend>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={255}
                className={ui.input}
                placeholder="Monthly reporting reminder"
              />
            </label>

            <label className="block text-sm">
              <FieldLegend required={!usingTemplate}>Message</FieldLegend>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={7}
                className={cn(ui.input, "min-h-[10rem] resize-y py-2.5")}
                placeholder="Please submit partner reports for the current period by end of week."
              />
            </label>

            {usingTemplate ? (
              <p className={ui.hint}>
                Placeholder {"{{period}}"} is filled from the month and year
                above. You can edit the text before sending.
              </p>
            ) : null}

            <NotificationAttachmentPicker
              attachments={attachments}
              onChange={setAttachments}
              disabled={sending}
            />
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Delivery</h3>
              <p className="mt-1 text-xs text-foreground-subtle">
                Who should get this, and how.
              </p>
            </div>

            <fieldset className="space-y-2">
              <FieldLegend required>Audience</FieldLegend>
              <div className="grid grid-cols-3 gap-2 sm:max-w-lg">
                {AUDIENCE_OPTIONS.map((option) => {
                  const selected = audience === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={sending}
                      onClick={() => setAudience(option.value)}
                      className={cn(
                        "rounded-xl border bg-surface px-2 py-2.5 text-center text-sm font-medium shadow-[var(--shadow-sm)] transition-colors",
                        selected
                          ? "border-primary text-foreground ring-2 ring-[var(--ring)]"
                          : "border-border text-foreground-muted hover:border-border-strong hover:text-foreground",
                      )}
                    >
                      {option.value === "both" ? "Both" : option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <FieldLegend required>Delivery method</FieldLegend>
              <div className="grid gap-3 sm:grid-cols-3">
                {DELIVERY_OPTIONS.map((option) => {
                  const selected = deliveryChannel === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex h-full cursor-pointer items-start gap-3 rounded-xl border bg-surface p-3 text-sm shadow-[var(--shadow-sm)] transition-colors",
                        selected
                          ? "border-primary ring-2 ring-[var(--ring)]"
                          : "border-border hover:border-border-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name="deliveryChannel"
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
          </div>

          {(showOpcos || showPartners) && (
            <div className="space-y-4 border-t border-border pt-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Recipients
                </h3>
                <p className="mt-1 text-xs text-foreground-subtle">
                  Select who should receive this intimation.
                </p>
              </div>

              <div
                className={cn(
                  "grid gap-4",
                  showOpcos && showPartners ? "lg:grid-cols-2" : "grid-cols-1",
                )}
              >
                {showOpcos ? (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLegend required>OpCos</FieldLegend>
                      <div className="flex gap-2 text-xs">
                        <Button
                          variant="ghost"
                          className="h-auto px-0 py-0 text-xs underline"
                          onClick={() =>
                            setSelectedOpcoIds(
                              formOptions.opcos.map((opco) => opco.id),
                            )
                          }
                        >
                          Select all
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-auto px-0 py-0 text-xs underline"
                          onClick={() => setSelectedOpcoIds([])}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-border p-3">
                      {formOptions.opcos.length === 0 ? (
                        <p className="text-sm text-foreground-subtle">
                          No OpCos configured.
                        </p>
                      ) : (
                        <div
                          className={cn(
                            "grid gap-2",
                            showOpcos && showPartners
                              ? "grid-cols-1 sm:grid-cols-2"
                              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                          )}
                        >
                          {formOptions.opcos.map((opco) => (
                            <label
                              key={opco.id}
                              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                            >
                              <input
                                type="checkbox"
                                checked={selectedOpcoIds.includes(opco.id)}
                                onChange={() => toggleOpco(opco.id)}
                                className="rounded border-border"
                              />
                              <span className="min-w-0 truncate">{opco.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {showPartners ? (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLegend required>Partners</FieldLegend>
                      <div className="flex gap-2 text-xs">
                        <Button
                          variant="ghost"
                          className="h-auto px-0 py-0 text-xs underline"
                          onClick={() =>
                            setSelectedPartnerIds(
                              formOptions.partners.map((partner) => partner.id),
                            )
                          }
                        >
                          Select all
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-auto px-0 py-0 text-xs underline"
                          onClick={() => setSelectedPartnerIds([])}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-border p-3">
                      {formOptions.partners.length === 0 ? (
                        <p className="text-sm text-foreground-subtle">
                          No Partners configured.
                        </p>
                      ) : (
                        <div
                          className={cn(
                            "grid gap-2",
                            showOpcos && showPartners
                              ? "grid-cols-1 sm:grid-cols-2"
                              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                          )}
                        >
                          {formOptions.partners.map((partner) => (
                            <label
                              key={partner.id}
                              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPartnerIds.includes(partner.id)}
                                onChange={() => togglePartner(partner.id)}
                                className="rounded border-border"
                              />
                              <span className="min-w-0 truncate">
                                {partner.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-foreground-muted">
              <p>
                <span className="font-medium text-foreground">
                  {recipientSummary}
                </span>
                <span className="mx-2 text-foreground-subtle">·</span>
                {deliveryLabel}
                {attachments.length > 0 ? (
                  <>
                    <span className="mx-2 text-foreground-subtle">·</span>
                    {attachments.length} attachment
                    {attachments.length === 1 ? "" : "s"}
                  </>
                ) : null}
              </p>
            </div>
            <Button
              className="w-full sm:w-auto sm:min-w-[12rem]"
              onClick={() => void sendIntimation()}
              disabled={sending || !canSend}
            >
              {sendLabel}
            </Button>
          </div>
        </div>
      </section>
    </PageCard>
  );
}
