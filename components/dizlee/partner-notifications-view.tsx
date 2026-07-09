"use client";

import { useCallback, useState } from "react";

import { NotificationsTabs } from "@/components/dizlee/notifications-tabs";
import type {
  PartnerNotificationFormOptions,
  PartnerNotificationListResult,
} from "@/lib/dizlee/notifications/partners";

const PRIORITY_OPTIONS = [
  { value: "", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "LOW", label: "Low" },
];

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type PartnerNotificationsViewProps = {
  initialResult: PartnerNotificationListResult;
  initialFormOptions: PartnerNotificationFormOptions;
};

export function PartnerNotificationsView({
  initialResult,
  initialFormOptions,
}: PartnerNotificationsViewProps) {
  const [result, setResult] = useState(initialResult);
  const [formOptions, setFormOptions] =
    useState<PartnerNotificationFormOptions>(initialFormOptions);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadList = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/notifications/partners?page=${page}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load partner notifications");
      }
      setResult(payload.data as PartnerNotificationListResult);
      if (payload.formOptions) {
        setFormOptions(payload.formOptions as PartnerNotificationFormOptions);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load partner notifications",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePartner = (partnerId: string) => {
    setSelectedPartnerIds((current) =>
      current.includes(partnerId)
        ? current.filter((id) => id !== partnerId)
        : [...current, partnerId],
    );
  };

  const selectAllPartners = () => {
    setSelectedPartnerIds(formOptions.partners.map((partner) => partner.id));
  };

  const clearPartners = () => {
    setSelectedPartnerIds([]);
  };

  const sendNotification = async () => {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/dizlee/notifications/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          partnerIds: selectedPartnerIds,
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
          Send in-app notifications to Partners (UC-08).
        </p>
      </div>

      <NotificationsTabs active="partners" />

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
          <h2 className="text-lg font-medium text-foreground">Compose message</h2>
          <p className="mt-1 text-sm text-foreground-subtle">
            Delivered to the selected Partners&apos; notification inboxes.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="text-foreground-muted">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={255}
                className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                placeholder="Invoice submission reminder"
              />
            </label>

            <label className="block text-sm">
              <span className="text-foreground-muted">Message</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={6}
                className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                placeholder="Please upload your monthly invoice by the agreed deadline."
              />
            </label>

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

            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground-muted">Recipients (Partners)</span>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllPartners}
                    className="font-medium text-foreground-muted underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearPartners}
                    className="font-medium text-foreground-muted underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {formOptions.partners.length === 0 ? (
                  <p className="text-sm text-foreground-subtle">No Partners configured.</p>
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

            <button
              type="button"
              onClick={() => void sendNotification()}
              disabled={
                sending ||
                !subject.trim() ||
                !body.trim() ||
                selectedPartnerIds.length === 0
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send to Partners"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-medium text-foreground">Recent messages</h2>
          <p className="mt-1 text-sm text-foreground-subtle">
            Notifications sent to Partners from Dizlee.
          </p>

          <div className="mt-4 space-y-3">
            {result.items.length === 0 ? (
              <p className="text-sm text-foreground-subtle">No partner messages sent yet.</p>
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
                    To:{" "}
                    {item.partnerNames.join(", ") ||
                      `${item.recipientCount} Partner(s)`}
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
