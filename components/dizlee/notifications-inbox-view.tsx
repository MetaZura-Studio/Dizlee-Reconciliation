/**
 * Dizlee user inbox for system notifications with read/unread state.
 * Complements broadcast history with actionable incoming messages.
 */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { NotificationsTabs } from "@/components/dizlee/notifications-tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  IconCheck,
  IconChevronRight,
  IconFile,
  IconSearch,
  IconUpload,
  IconUsers,
} from "@/components/ui/icons";
import { LoadingOverlay } from "@/components/ui/loading";
import { PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import type { InboxDetail, InboxListResult } from "@/lib/dizlee/notifications/inbox";
import { formatAppError } from "@/lib/errors/format";
import { formatNotificationTime } from "@/lib/platform/notification-deep-links";
import type { NotificationCategory } from "@/lib/platform/notification-metadata";
import { cn, ui } from "@/lib/ui/classes";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function categoryLabel(category: NotificationCategory): string {
  if (category === "request") {
    return "Request";
  }
  if (category === "report") {
    return "Report";
  }
  return "System";
}

function categoryTone(
  category: NotificationCategory,
): "info" | "success" | "neutral" {
  if (category === "request") {
    return "info";
  }
  if (category === "report") {
    return "success";
  }
  return "neutral";
}

function CategoryIcon({
  category,
  className,
}: {
  category: NotificationCategory;
  className?: string;
}) {
  if (category === "request") {
    return <IconUsers className={className} />;
  }
  if (category === "report") {
    return <IconUpload className={className} />;
  }
  return <IconFile className={className} />;
}

function categoryIconWrap(category: NotificationCategory): string {
  if (category === "request") {
    return "bg-primary-muted text-primary";
  }
  if (category === "report") {
    return "bg-success-muted text-success";
  }
  return "bg-surface-muted text-foreground-muted";
}

function detailIntro(detail: InboxDetail): string {
  if (detail.metadata?.type === "OPCO_REPORT_UPLOAD") {
    const count = detail.metadata.partners.length;
    const partnerWord = count === 1 ? "partner" : "partners";
    return `${detail.metadata.opcoName} uploaded reports for ${count} ${partnerWord}. Review the partners below, then open reports to continue.`;
  }
  if (
    detail.metadata?.type === "OPCO_REUPLOAD_REQUEST" ||
    detail.metadata?.type === "PARTNER_REUPLOAD_REQUEST"
  ) {
    return `A reupload request has been submitted. Please review the details below and take the required action.`;
  }
  if (detail.metadata?.type === "PARTNER_LINK_REQUEST") {
    return `A partner-link request has been submitted. Please review the details below.`;
  }
  return detail.body.split("\n")[0] ?? detail.body;
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
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<InboxDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const loadList = useCallback(
    async (page = 1, onlyUnread = unreadOnly, searchTerm = search) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          unreadOnly: String(onlyUnread),
        });
        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }
        const response = await fetch(`/api/dizlee/notifications/inbox?${params}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load inbox"));
        }
        setResult(payload.data as InboxListResult);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load inbox",
        );
      } finally {
        setLoading(false);
      }
    },
    [search, unreadOnly],
  );

  const loadDetail = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setDetailLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dizlee/notifications/inbox/${id}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load notification"));
        }
        setDetail(payload.data as InboxDetail);
        await loadList(result.page, unreadOnly, search);
        window.dispatchEvent(new CustomEvent("dizlee-inbox-updated"));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load notification",
        );
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [loadList, result.page, search, unreadOnly],
  );

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
        throw new Error(formatAppError(payload, "Failed to mark all as read"));
      }
      await loadList(result.page, unreadOnly, search);
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
  }, [loadList, markingAllRead, result.page, result.unreadCount, search, unreadOnly]);

  useEffect(() => {
    const handleFocus = () => {
      void loadList(result.page, unreadOnly, search);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadList, result.page, search, unreadOnly]);

  return (
    <PageCard>
      <PageHeader
        title="Notifications"
        description="Messages from OpCos, including partner-link and reupload requests so they can upload reports."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={result.unreadCount === 0 || markingAllRead || loading}
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-2"
            >
              <IconCheck className="h-4 w-4" />
              {markingAllRead ? "Marking…" : "Mark all as read"}
            </Button>
            <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground-muted">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) => {
                  setUnreadOnly(event.target.checked);
                  void loadList(1, event.target.checked, search);
                }}
                className="rounded border-border"
              />
              Unread only
            </label>
          </>
        }
      />

      <NotificationsTabs active="inbox" />

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <LoadingOverlay
          active={loading}
          className={cn(ui.tableWrap, "min-h-[20rem] overflow-hidden")}
        >
          <div className="border-b border-border px-4 py-3">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchDraft);
                void loadList(1, unreadOnly, searchDraft);
              }}
            >
              <label className="relative flex-1">
                <span className="sr-only">Search notifications</span>
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search notifications..."
                  className={cn(ui.input, "w-full pl-9")}
                />
              </label>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
            <p className="mt-2 text-xs text-foreground-subtle">
              {result.unreadCount} unread · {result.totalCount} total
            </p>
          </div>

          <div className="divide-y divide-border">
            {result.items.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent shadow-none"
                title={
                  unreadOnly
                    ? "No unread notifications"
                    : search
                      ? "No matching notifications"
                      : "Your inbox is empty"
                }
              />
            ) : (
              result.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadDetail(item.id)}
                  className={cn(
                    "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted",
                    selectedId === item.id && "bg-surface-muted",
                    !item.isRead && "bg-primary-muted/30",
                  )}
                >
                  <div className="flex w-3 shrink-0 justify-center pt-2">
                    {!item.isRead ? (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      categoryIconWrap(item.category),
                    )}
                  >
                    <CategoryIcon category={item.category} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium text-foreground">
                        {item.subject}
                      </p>
                      <span className="shrink-0 text-xs text-foreground-subtle">
                        {formatNotificationTime(item.receivedAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">
                      {item.bodyPreview}
                    </p>
                    {item.opcoName ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground-subtle">
                        <IconUsers className="h-3.5 w-3.5" />
                        {item.opcoName}
                      </p>
                    ) : null}
                  </div>
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

        <LoadingOverlay
          active={detailLoading}
          className={cn(ui.cardPadding, "min-h-[20rem] border border-border")}
        >
          {detail ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">
                  {detail.subject}
                </h2>
                <StatusPill tone={categoryTone(detail.category)}>
                  {categoryLabel(detail.category)}
                </StatusPill>
              </div>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground-subtle">
                {detail.opcoName ? (
                  <span className="inline-flex items-center gap-1.5">
                    <IconUsers className="h-3.5 w-3.5" />
                    {detail.opcoName}
                  </span>
                ) : (
                  <span>From {detail.fromName}</span>
                )}
                <span>·</span>
                <span>{formatDateTime(detail.receivedAt)}</span>
              </p>

              <p className="mt-4 text-sm text-foreground-muted">
                {detailIntro(detail)}
              </p>

              {detail.metadata?.type === "OPCO_REPORT_UPLOAD" ? (
                <div className="mt-5 overflow-hidden rounded-md border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-border">
                        <th className="bg-surface-muted px-3 py-2 text-left font-medium text-foreground-muted">
                          OpCo
                        </th>
                        <td className="px-3 py-2 text-foreground">
                          {detail.metadata.opcoName}
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <th className="bg-surface-muted px-3 py-2 text-left font-medium text-foreground-muted">
                          Period
                        </th>
                        <td className="px-3 py-2 text-foreground">
                          {detail.metadata.month}/{detail.metadata.year}
                        </td>
                      </tr>
                      <tr>
                        <th className="bg-surface-muted px-3 py-2 align-top text-left font-medium text-foreground-muted">
                          Partners
                        </th>
                        <td className="px-3 py-2 text-foreground">
                          <ul className="space-y-1">
                            {detail.metadata.partners.map((partner) => (
                              <li key={partner.id}>{partner.name}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}

              {(detail.metadata?.type === "OPCO_REUPLOAD_REQUEST" ||
                detail.metadata?.type === "PARTNER_REUPLOAD_REQUEST") && (
                <div className="mt-5 overflow-hidden rounded-md border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-border">
                        <th className="bg-surface-muted px-3 py-2 text-left font-medium text-foreground-muted">
                          OpCo
                        </th>
                        <td className="px-3 py-2">{detail.metadata.opcoName}</td>
                      </tr>
                      <tr className="border-b border-border">
                        <th className="bg-surface-muted px-3 py-2 text-left font-medium text-foreground-muted">
                          Partner
                        </th>
                        <td className="px-3 py-2">{detail.metadata.partnerName}</td>
                      </tr>
                      <tr className="border-b border-border">
                        <th className="bg-surface-muted px-3 py-2 text-left font-medium text-foreground-muted">
                          Period
                        </th>
                        <td className="px-3 py-2">
                          {detail.metadata.month}/{detail.metadata.year}
                        </td>
                      </tr>
                      <tr>
                        <th className="bg-surface-muted px-3 py-2 text-left font-medium text-foreground-muted">
                          Request type
                        </th>
                        <td className="px-3 py-2">Report reupload</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {detail.metadata?.type !== "OPCO_REPORT_UPLOAD" &&
              detail.metadata?.type !== "OPCO_REUPLOAD_REQUEST" &&
              detail.metadata?.type !== "PARTNER_REUPLOAD_REQUEST" ? (
                <p className="mt-5 whitespace-pre-wrap text-sm text-foreground-muted">
                  {detail.body}
                </p>
              ) : detail.metadata?.type === "OPCO_REUPLOAD_REQUEST" ||
                detail.metadata?.type === "PARTNER_REUPLOAD_REQUEST" ? (
                <div className="mt-5">
                  <h3 className="text-sm font-medium text-foreground">Message</h3>
                  <p className="mt-2 whitespace-pre-wrap rounded-md bg-surface-muted px-3 py-2 text-sm text-foreground-muted">
                    {detail.body}
                  </p>
                </div>
              ) : null}

              {detail.action ? (
                <div className="mt-auto flex justify-end gap-2 border-t border-border pt-4">
                  <Link
                    href={detail.action.href}
                    className={cn(ui.btnPrimary, "inline-flex items-center gap-2")}
                  >
                    {detail.action.label}
                    <IconChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-foreground-subtle">
              Select a message to read. Opening marks it as read.
            </p>
          )}
        </LoadingOverlay>
      </div>
    </PageCard>
  );
}
