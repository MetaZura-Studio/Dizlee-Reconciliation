"use client";

import { useCallback, useState } from "react";

import { NotificationsTabs } from "@/components/dizlee/notifications-tabs";
import type {
  NotificationHistoryDetail,
  NotificationHistoryResult,
} from "@/lib/dizlee/notifications/history";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type NotificationHistoryViewProps = {
  initialResult: NotificationHistoryResult;
  initialDetail: NotificationHistoryDetail | null;
  initialSelectedId: string | null;
};

export function NotificationHistoryView({
  initialResult,
  initialDetail,
  initialSelectedId,
}: NotificationHistoryViewProps) {
  const [result, setResult] = useState(initialResult);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<NotificationHistoryDetail | null>(
    initialDetail,
  );
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/notifications/history?page=${page}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load history");
      }
      setResult(payload.data as NotificationHistoryResult);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load history",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/notifications/history/${id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load notification");
      }
      setDetail(payload.data as NotificationHistoryDetail);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load notification",
      );
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-foreground-subtle">
          View all notifications sent from Dizlee (UC-9A).
        </p>
      </div>

      <NotificationsTabs active="history" />

      {error ? (
        <div className="rounded-lg border border-danger-border bg-danger-muted px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-medium text-foreground">Sent notifications</h2>
            <p className="text-sm text-foreground-subtle">{result.totalCount} total</p>
          </div>

          <div className="divide-y divide-border">
            {result.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-foreground-subtle">
                No notifications sent yet.
              </p>
            ) : (
              result.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadDetail(item.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-surface-muted ${
                    selectedId === item.id ? "bg-surface-muted" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{item.subject}</p>
                    {item.priority ? (
                      <span className="shrink-0 rounded-full bg-primary-muted px-2 py-0.5 text-xs text-foreground-muted">
                        {item.priority}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-foreground-muted">{item.bodyPreview}</p>
                  <p className="mt-2 text-xs text-foreground-subtle">
                    To: {item.recipientSummary}
                  </p>
                  <p className="mt-1 text-xs text-foreground-subtle">
                    {formatDateTime(item.sentAt)} · {item.sentBy}
                  </p>
                </button>
              ))
            )}
          </div>

          {result.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-foreground-muted">
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

        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-medium text-foreground">Detail</h2>
          {detailLoading ? (
            <p className="mt-4 text-sm text-foreground-subtle">Loading…</p>
          ) : detail ? (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">{detail.subject}</h3>
                <p className="mt-1 text-sm text-foreground-subtle">
                  Sent {formatDateTime(detail.sentAt)} by {detail.sentBy}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground-muted">{detail.body}</p>
              <div>
                <p className="text-sm font-medium text-foreground-muted">Recipients</p>
                <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
                  {detail.recipients.map((recipient, index) => (
                    <li key={`${recipient.type}-${recipient.name}-${index}`}>
                      {recipient.type}: {recipient.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-foreground-subtle">
              Select a notification to view details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
