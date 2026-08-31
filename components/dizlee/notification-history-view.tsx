/**
 * History of sent Dizlee notification broadcasts and delivery metadata.
 * Allows reviewing past intimations, reminders, and attachments.
 */

"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CommunicationsOutboxTabs } from "@/components/dizlee/communications-outbox-tabs";
import { CommunicationsTabs } from "@/components/dizlee/communications-tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingOverlay } from "@/components/ui/loading";
import { PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { cn, ui } from "@/lib/ui/classes";
import type {
  NotificationHistoryDetail,
  NotificationHistoryResult,
} from "@/lib/dizlee/notifications/history";
import {
  parseOutboxFilters,
  type OutboxKind,
  type OutboxKindFilter,
} from "@/lib/dizlee/notifications/outbox-filters";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { formatAppError } from "@/lib/errors/format";

function kindTone(kind: OutboxKind): "danger" | "info" | "neutral" {
  if (kind === "reminder") {
    return "danger";
  }
  if (kind === "intimation") {
    return "info";
  }
  return "neutral";
}

type NotificationHistoryViewProps = {
  initialResult: NotificationHistoryResult;
  initialDetail: NotificationHistoryDetail | null;
  initialSelectedId: string | null;
  initialKind: OutboxKindFilter;
};

export function NotificationHistoryView({
  initialResult,
  initialDetail,
  initialSelectedId,
  initialKind,
}: NotificationHistoryViewProps) {
  const searchParams = useSearchParams();
  const { kind } = parseOutboxFilters(searchParams);

  const [result, setResult] = useState(initialResult);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<NotificationHistoryDetail | null>(
    initialDetail,
  );
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ page: String(page) });
        if (kind !== "all") {
          query.set("filter", kind);
        }
        const response = await fetch(
          `/api/dizlee/notifications/history?${query.toString()}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load outbox"));
        }
        setResult(payload.data as NotificationHistoryResult);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load outbox",
        );
      } finally {
        setLoading(false);
      }
    },
    [kind],
  );

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/notifications/history/${id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load notification"));
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

  const activeKind = result.kind ?? initialKind;

  return (
    <PageCard>
      <PageHeader
        title="Communications"
        description="View notifications sent from Dizlee to OpCos and Partners."
      />

      <CommunicationsTabs active="outbox" />

      <div className="mt-4">
        <CommunicationsOutboxTabs active={activeKind} />
      </div>

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <LoadingOverlay active={loading} className={cn(ui.tableWrap, "min-h-[16rem]")}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-medium text-foreground">Outbox</h2>
            <p className="text-sm text-foreground-subtle">{result.totalCount} total</p>
          </div>

          <div className="divide-y divide-border">
            {result.items.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent shadow-none"
                title={
                  activeKind === "intimation"
                    ? "No intimations in outbox"
                    : activeKind === "reminder"
                      ? "No reminders in outbox"
                      : activeKind === "other"
                        ? "No other notifications"
                        : "No notifications sent yet"
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
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{item.subject}</p>
                    <StatusPill tone={kindTone(item.kind)} className="shrink-0">
                      {item.kindLabel}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-foreground-muted">{item.bodyPreview}</p>
                  <p className="mt-2 text-xs text-foreground-subtle">
                    To: {item.recipientSummary}
                  </p>
                  <p className="mt-1 text-xs text-foreground-subtle">
                    {formatAppDateTime(item.sentAt)} · {item.sentBy}
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
          <h2 className="font-medium text-foreground">Detail</h2>
          {detail ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-medium text-foreground">{detail.subject}</h3>
                  <StatusPill tone={kindTone(detail.kind)}>
                    {detail.kindLabel}
                  </StatusPill>
                </div>
                <p className="mt-1 text-sm text-foreground-subtle">
                  Sent {formatAppDateTime(detail.sentAt)} by {detail.sentBy}
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
        </LoadingOverlay>
      </div>
    </PageCard>
  );
}
