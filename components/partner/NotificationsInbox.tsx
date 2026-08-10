/**
 * Partner notification inbox with mark-read and attachment access.
 * Surfaces intimation, reminder, and system messages from Dizlee.
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { IconTrash } from "@/components/ui/icons";
import { cn, ui } from "@/lib/ui/classes";
import type {
  PartnerInboxDetail,
  PartnerInboxFilters,
  PartnerInboxListResult,
} from "@/lib/partner/queries/notifications";
import { notificationAttachmentDownloadUrl } from "@/lib/platform/notification-attachment-url";
import { formatAppError } from "@/lib/errors/format";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildInboxQuery(filters: PartnerInboxFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    unreadOnly: String(filters.unreadOnly),
  });

  return params.toString();
}

type NotificationsInboxProps = {
  initialResult: PartnerInboxListResult;
};

export function NotificationsInbox({ initialResult }: NotificationsInboxProps) {
  const router = useRouter();
  const result = initialResult;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PartnerInboxDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const unreadOnly = result.filters.unreadOnly;

  const refreshList = useCallback(
    (filters: PartnerInboxFilters) => {
      router.push(`/partner/notifications?${buildInboxQuery(filters)}`);
    },
    [router],
  );

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/partner/notifications/${id}`);
      const payload = (await response.json()) as {
        detail?: PartnerInboxDetail;
        error?: string;
      };

      if (!response.ok || !payload.detail) {
        throw new Error(formatAppError(payload, "Failed to load notification"));
      }

      setDetail(payload.detail);
      router.refresh();
      window.dispatchEvent(new CustomEvent("partner-inbox-updated"));
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
      const response = await fetch(`/api/partner/notifications/${selectedId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to dismiss notification"));
      }

      setSelectedId(null);
      setDetail(null);
      router.refresh();
      window.dispatchEvent(new CustomEvent("partner-inbox-updated"));
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

  async function markAllRead() {
    if (result.unreadCount === 0 || markingAllRead) {
      return;
    }

    setMarkingAllRead(true);
    setError(null);

    try {
      const response = await fetch("/api/partner/notifications/mark-all-read", {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to mark all as read"));
      }

      router.refresh();
      window.dispatchEvent(new CustomEvent("partner-inbox-updated"));
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Failed to mark all as read",
      );
    } finally {
      setMarkingAllRead(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-muted">
          {result.unreadCount} unread · {result.totalCount} total
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={result.unreadCount === 0 || markingAllRead}
            onClick={() => void markAllRead()}
          >
            {markingAllRead ? "Marking…" : "Mark all as read"}
          </Button>
          <label className="flex items-center gap-2 text-sm text-foreground-muted">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => {
                refreshList({
                  page: 1,
                  unreadOnly: event.target.checked,
                });
              }}
              className="rounded border-border"
            />
            Unread only
          </label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={ui.tableWrap}>
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
                      <span className="shrink-0 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-semibold text-foreground-muted">
                        {item.priority}
                      </span>
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
                  disabled={result.page <= 1}
                  onClick={() =>
                    refreshList({
                      ...result.filters,
                      page: result.page - 1,
                    })
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={result.page >= result.totalPages}
                  onClick={() =>
                    refreshList({
                      ...result.filters,
                      page: result.page + 1,
                    })
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className={ui.cardPaddingLg}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-foreground">Message</h2>
            {selectedId ? (
              <IconButton
                label={dismissing ? "Dismissing..." : "Dismiss"}
                variant="danger"
                onClick={() => void dismissSelected()}
                disabled={dismissing}
              >
                <IconTrash />
              </IconButton>
            ) : null}
          </div>

          {detailLoading ? (
            <p className="mt-4 text-sm text-foreground-subtle">Loading…</p>
          ) : detail ? (
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
              {detail.attachments.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-foreground">Attachments</h4>
                  <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
                    {detail.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <a
                          href={notificationAttachmentDownloadUrl(
                            "partner",
                            detail.id,
                            attachment.id,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground"
                        >
                          {attachment.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-foreground-subtle">
              Select a message to read. Opening marks it as read.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
