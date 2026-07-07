"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type {
  OpcoInboxDetail,
  OpcoInboxFilters,
  OpcoInboxListResult,
} from "@/lib/opco/queries/notifications";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildInboxQuery(filters: OpcoInboxFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    unreadOnly: String(filters.unreadOnly),
  });

  return params.toString();
}

type NotificationsInboxProps = {
  initialResult: OpcoInboxListResult;
};

export function NotificationsInbox({ initialResult }: NotificationsInboxProps) {
  const router = useRouter();
  const result = initialResult;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OpcoInboxDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);

  const unreadOnly = result.filters.unreadOnly;

  const refreshList = useCallback(
    (filters: OpcoInboxFilters) => {
      router.push(`/opco/notifications?${buildInboxQuery(filters)}`);
    },
    [router],
  );

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/opco/notifications/${id}`);
      const payload = (await response.json()) as {
        detail?: OpcoInboxDetail;
        error?: string;
      };

      if (!response.ok || !payload.detail) {
        throw new Error(payload.error ?? "Failed to load notification");
      }

      setDetail(payload.detail);
      router.refresh();
      window.dispatchEvent(new CustomEvent("opco-inbox-updated"));
    } catch (loadError) {
      setDetail(null);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load notification",
      );
    } finally {
      setDetailLoading(false);
    }
  }, [router]);

  async function dismissSelected() {
    if (!selectedId) {
      return;
    }

    setDismissing(true);
    setError(null);

    try {
      const response = await fetch(`/api/opco/notifications/${selectedId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to dismiss notification");
      }

      setSelectedId(null);
      setDetail(null);
      router.refresh();
      window.dispatchEvent(new CustomEvent("opco-inbox-updated"));
    } catch (dismissError) {
      setError(
        dismissError instanceof Error
          ? dismissError.message
          : "Failed to dismiss notification",
      );
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
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
              refreshList({
                page: 1,
                unreadOnly: event.target.checked,
              });
            }}
            className="rounded border-zinc-300"
          />
          Unread only
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
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
                  disabled={result.page <= 1}
                  onClick={() =>
                    refreshList({
                      ...result.filters,
                      page: result.page - 1,
                    })
                  }
                  className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={result.page >= result.totalPages}
                  onClick={() =>
                    refreshList({
                      ...result.filters,
                      page: result.page + 1,
                    })
                  }
                  className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-zinc-900">Message</h2>
            {selectedId ? (
              <button
                type="button"
                onClick={() => void dismissSelected()}
                disabled={dismissing}
                className="text-sm text-zinc-600 underline hover:text-zinc-900 disabled:opacity-50"
              >
                {dismissing ? "Dismissing..." : "Dismiss"}
              </button>
            ) : null}
          </div>

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
              {detail.attachments.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-zinc-900">Attachments</h4>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                    {detail.attachments.map((attachment) => (
                      <li key={attachment.id}>{attachment.filename}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Select a message to read. Opening marks it as read.
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        Account settings:{" "}
        <Link href="/change-password" className="text-zinc-900 underline">
          Change password
        </Link>
      </p>
    </div>
  );
}
