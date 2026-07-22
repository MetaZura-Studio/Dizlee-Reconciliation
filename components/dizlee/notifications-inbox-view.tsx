"use client";

import { useCallback, useEffect, useState } from "react";

import { NotificationsTabs } from "@/components/dizlee/notifications-tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingOverlay } from "@/components/ui/loading";
import { PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { cn, ui } from "@/lib/ui/classes";
import type { InboxDetail, InboxListResult } from "@/lib/dizlee/notifications/inbox";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function priorityTone(priority: string | null): "danger" | "info" | "neutral" {
  if (priority === "HIGH") {
    return "danger";
  }
  if (priority === "LOW") {
    return "info";
  }
  return "neutral";
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
  const [markingAllRead, setMarkingAllRead] = useState(false);

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

  const markAllRead = useCallback(async () => {
    if (result.unreadCount === 0 || markingAllRead) {
      return;
    }
    setMarkingAllRead(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/dizlee/notifications/inbox/mark-all-read",
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to mark all as read");
      }
      await loadList(result.page, unreadOnly);
      window.dispatchEvent(new CustomEvent("dizlee-inbox-updated"));
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Failed to mark all as read",
      );
    } finally {
      setMarkingAllRead(false);
    }
  }, [loadList, markingAllRead, result.page, result.unreadCount, unreadOnly]);

  useEffect(() => {
    const handleFocus = () => {
      void loadList(result.page, unreadOnly);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadList, result.page, unreadOnly]);

  return (
    <PageCard>
      <PageHeader
        title="Notifications"
        description="Your Dizlee inbox — messages received from OpCos and the system."
      />

      <NotificationsTabs active="inbox" />

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-muted">
          {result.unreadCount} unread · {result.totalCount} total
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={result.unreadCount === 0 || markingAllRead || loading}
            onClick={() => void markAllRead()}
          >
            {markingAllRead ? "Marking…" : "Mark all as read"}
          </Button>
          <label className="flex items-center gap-2 text-sm text-foreground-muted">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => {
                setUnreadOnly(event.target.checked);
                void loadList(1, event.target.checked);
              }}
              className="rounded border-border"
            />
            Unread only
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <LoadingOverlay active={loading} className={cn(ui.tableWrap, "min-h-[16rem]")}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-medium text-foreground">Inbox</h2>
          </div>

          <div className="divide-y divide-border">
            {result.items.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent shadow-none"
                title={
                  unreadOnly ? "No unread notifications" : "Your inbox is empty"
                }
              />
            ) : (
              result.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadDetail(item.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-surface-muted",
                    selectedId === item.id && "bg-surface-muted",
                    !item.isRead && ui.unreadRow,
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {!item.isRead ? "• " : ""}
                      {item.subject}
                    </p>
                    {item.priority ? (
                      <StatusPill tone={priorityTone(item.priority)} className="shrink-0">
                        {item.priority}
                      </StatusPill>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-foreground-muted">{item.bodyPreview}</p>
                  <p className="mt-2 text-xs text-foreground-subtle">
                    From {item.fromName} · {formatDateTime(item.receivedAt)}
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
                <Button
                  variant="secondary"
                  disabled={result.page <= 1 || loading}
                  onClick={() => void loadList(result.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={result.page >= result.totalPages || loading}
                  onClick={() => void loadList(result.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </LoadingOverlay>

        <LoadingOverlay active={detailLoading} className={cn(ui.cardPadding, "min-h-[12rem]")}>
          <h2 className="font-medium text-foreground">Message</h2>
          {detail ? (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">{detail.subject}</h3>
                <p className="mt-1 text-sm text-foreground-subtle">
                  From {detail.fromName} · {formatDateTime(detail.receivedAt)}
                </p>
                {detail.readAt ? (
                  <p className="text-xs text-foreground-subtle">
                    Read {formatDateTime(detail.readAt)}
                  </p>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground-muted">{detail.body}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-foreground-subtle">
              Select a message to read. Opening marks it as read.
            </p>
          )}
        </LoadingOverlay>
      </div>
    </PageCard>
  );
}
