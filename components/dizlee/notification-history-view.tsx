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
        <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
        <p className="mt-1 text-sm text-zinc-500">
          View all notifications sent from Dizlee (UC-9A).
        </p>
      </div>

      <NotificationsTabs active="history" />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-medium text-zinc-900">Sent notifications</h2>
            <p className="text-sm text-zinc-500">{result.totalCount} total</p>
          </div>

          <div className="divide-y divide-zinc-100">
            {result.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No notifications sent yet.
              </p>
            ) : (
              result.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadDetail(item.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${
                    selectedId === item.id ? "bg-zinc-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-zinc-900">{item.subject}</p>
                    {item.priority ? (
                      <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
                        {item.priority}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{item.bodyPreview}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    To: {item.recipientSummary}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDateTime(item.sentAt)} · {item.sentBy}
                  </p>
                </button>
              ))
            )}
          </div>

          {result.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
              <span>
                Page {result.page} of {result.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={result.page <= 1 || loading}
                  onClick={() => void loadList(result.page - 1)}
                  className="rounded-lg border border-zinc-300 px-3 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={result.page >= result.totalPages || loading}
                  onClick={() => void loadList(result.page + 1)}
                  className="rounded-lg border border-zinc-300 px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-medium text-zinc-900">Detail</h2>
          {detailLoading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading…</p>
          ) : detail ? (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-zinc-900">{detail.subject}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Sent {formatDateTime(detail.sentAt)} by {detail.sentBy}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-700">{detail.body}</p>
              <div>
                <p className="text-sm font-medium text-zinc-700">Recipients</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                  {detail.recipients.map((recipient, index) => (
                    <li key={`${recipient.type}-${recipient.name}-${index}`}>
                      {recipient.type}: {recipient.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Select a notification to view details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
