"use client";

import { useCallback, useEffect, useState } from "react";

import { NotificationsTabs } from "@/components/dizlee/notifications-tabs";
import type { InboxDetail, InboxListResult } from "@/lib/dizlee/notifications/inbox";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type NotificationsInboxViewProps = {
  initialResult: InboxListResult;
  initialDetail: InboxDetail | null;
  initialSelectedId: string | null;
};

export function NotificationsInboxView({
  initialResult,
  initialDetail,
  initialSelectedId,
}: NotificationsInboxViewProps) {
  const [result, setResult] = useState(initialResult);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<InboxDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async (page = 1, onlyUnread = unreadOnly) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        unreadOnly: String(onlyUnread),
      });
      const response = await fetch(`/api/dizlee/notifications/inbox?${params}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load inbox");
      }
      setResult(payload.data as InboxListResult);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load inbox",
      );
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/notifications/inbox/${id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load notification");
      }
      setDetail(payload.data as InboxDetail);
      await loadList(result.page, unreadOnly);
      window.dispatchEvent(new CustomEvent("dizlee-inbox-updated"));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load notification",
      );
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [loadList, result.page, unreadOnly]);

  useEffect(() => {
    const handleFocus = () => {
      void loadList(result.page, unreadOnly);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadList, result.page, unreadOnly]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your Dizlee inbox — messages received from OpCos and the system.
        </p>
      </div>

      <NotificationsTabs active="inbox" />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          {result.unreadCount} unread · {result.totalCount} total
        </p>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => {
              setUnreadOnly(event.target.checked);
              void loadList(1, event.target.checked);
            }}
            className="rounded border-zinc-300"
          />
          Unread only
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-medium text-zinc-900">Inbox</h2>
          </div>

          <div className="divide-y divide-zinc-100">
            {result.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                {unreadOnly ? "No unread notifications." : "Your inbox is empty."}
              </p>
            ) : (
              result.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadDetail(item.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${
                    selectedId === item.id ? "bg-zinc-50" : ""
                  } ${item.isRead ? "" : "bg-blue-50/40"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`font-medium ${
                        item.isRead ? "text-zinc-900" : "text-zinc-950"
                      }`}
                    >
                      {!item.isRead ? "• " : ""}
                      {item.subject}
                    </p>
                    {item.priority ? (
                      <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
                        {item.priority}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{item.bodyPreview}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    From {item.fromName} · {formatDateTime(item.receivedAt)}
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
          <h2 className="font-medium text-zinc-900">Message</h2>
          {detailLoading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading…</p>
          ) : detail ? (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-zinc-900">{detail.subject}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  From {detail.fromName} · {formatDateTime(detail.receivedAt)}
                </p>
                {detail.readAt ? (
                  <p className="text-xs text-zinc-500">
                    Read {formatDateTime(detail.readAt)}
                  </p>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-700">{detail.body}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Select a message to read. Opening marks it as read.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
