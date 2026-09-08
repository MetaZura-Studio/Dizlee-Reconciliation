/**
 * History of sent Dizlee notification broadcasts and delivery metadata.
 * Allows reviewing past intimations, reminders, and attachments.
 */

"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
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
  NotificationHistoryItem,
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

function emailSendTone(
  status: NotificationHistoryItem["emailSendStatus"],
): "success" | "warning" | "danger" | "neutral" {
  if (status === "sent") {
    return "success";
  }
  if (status === "partly_sent" || status === "not_sent") {
    return "warning";
  }
  if (status === "failed") {
    return "danger";
  }
  return "neutral";
}

function showsEmailDelivery(channel: string): boolean {
  const normalized = channel.toUpperCase();
  return normalized === "EMAIL" || normalized === "BOTH";
}

function DeliveryBreakdown({
  detail,
  sectionRef,
}: {
  detail: NotificationHistoryDetail;
  sectionRef: RefObject<HTMLDivElement | null>;
}) {
  if (!showsEmailDelivery(detail.deliveryChannel)) {
    return null;
  }

  return (
    <div
      ref={sectionRef}
      id="outbox-delivery-breakdown"
      tabIndex={-1}
      className="rounded-lg border border-border bg-surface-muted/40 p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <p className="text-sm font-medium text-foreground">Delivery</p>
      <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
        <li>
          <span className="font-medium text-foreground">In-app:</span> Sent
        </li>
        <li>
          <span className="font-medium text-foreground">Email:</span>{" "}
          {detail.emailSendLabel}
        </li>
      </ul>
      {detail.emailReason && detail.emailSendStatus !== "sent" ? (
        <p className={cn(ui.alertWarning, "mt-3 text-sm")}>{detail.emailReason}</p>
      ) : null}
      {detail.emailSendSummary && detail.emailSendStatus === "sent" ? (
        <p className="mt-2 text-xs text-foreground-subtle">
          {detail.emailSendSummary}
        </p>
      ) : null}
    </div>
  );
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
  const deliverySectionRef = useRef<HTMLDivElement>(null);
  const focusDeliveryAfterLoad = useRef(false);

  const [result, setResult] = useState(initialResult);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<NotificationHistoryDetail | null>(
    initialDetail,
  );
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const focusDeliveryBreakdown = useCallback(() => {
    window.requestAnimationFrame(() => {
      deliverySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      deliverySectionRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!detail || detailLoading || !focusDeliveryAfterLoad.current) {
      return;
    }
    focusDeliveryAfterLoad.current = false;
    focusDeliveryBreakdown();
  }, [detail, detailLoading, focusDeliveryBreakdown]);

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

  const loadDetail = useCallback(
    async (id: string, options?: { focusDelivery?: boolean }) => {
      setSelectedId(id);
      setDetailLoading(true);
      setError(null);
      if (options?.focusDelivery) {
        focusDeliveryAfterLoad.current = true;
      }
      try {
        const response = await fetch(`/api/dizlee/notifications/history/${id}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load notification"));
        }
        setDetail(payload.data as NotificationHistoryDetail);
      } catch (loadError) {
        focusDeliveryAfterLoad.current = false;
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
    [],
  );

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
                <div
                  key={item.id}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-surface-muted",
                    selectedId === item.id && "bg-surface-muted",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void loadDetail(item.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{item.subject}</p>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <StatusPill tone="info">
                          {item.deliveryChannelLabel}
                        </StatusPill>
                        <StatusPill tone={kindTone(item.kind)}>
                          {item.kindLabel}
                        </StatusPill>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {item.bodyPreview}
                    </p>
                    <p className="mt-2 text-xs text-foreground-subtle">
                      To: {item.recipientSummary}
                    </p>
                    <p className="mt-1 text-xs text-foreground-subtle">
                      {formatAppDateTime(item.sentAt)} · {item.sentBy}
                    </p>
                  </button>
                  {showsEmailDelivery(item.deliveryChannel) ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        title="View in-app vs email delivery details"
                        aria-label={`${item.emailSendPillLabel}. View delivery details.`}
                        onClick={() =>
                          void loadDetail(item.id, { focusDelivery: true })
                        }
                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <StatusPill tone={emailSendTone(item.emailSendStatus)}>
                          {item.emailSendPillLabel}
                        </StatusPill>
                      </button>
                    </div>
                  ) : null}
                </div>
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
          className={cn(ui.cardPadding, "min-h-[12rem]")}
        >
          <h2 className="font-medium text-foreground">Detail</h2>
          {detail ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-medium text-foreground">
                    {detail.subject}
                  </h3>
                  <StatusPill tone="info">{detail.deliveryChannelLabel}</StatusPill>
                  {showsEmailDelivery(detail.deliveryChannel) ? (
                    <button
                      type="button"
                      title="Show delivery breakdown"
                      aria-controls="outbox-delivery-breakdown"
                      onClick={focusDeliveryBreakdown}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <StatusPill tone={emailSendTone(detail.emailSendStatus)}>
                        {detail.emailSendPillLabel}
                      </StatusPill>
                    </button>
                  ) : null}
                  <StatusPill tone={kindTone(detail.kind)}>
                    {detail.kindLabel}
                  </StatusPill>
                </div>
                <p className="mt-1 text-sm text-foreground-subtle">
                  Sent {formatAppDateTime(detail.sentAt)} by {detail.sentBy}
                </p>
              </div>

              <DeliveryBreakdown
                detail={detail}
                sectionRef={deliverySectionRef}
              />

              <p className="whitespace-pre-wrap text-sm text-foreground-muted">
                {detail.body}
              </p>
              {detail.invoiceHref ? (
                <div>
                  <Link
                    href={detail.invoiceHref}
                    className={cn(ui.btnPrimary, "inline-flex items-center")}
                  >
                    {detail.invoiceLabel ?? "Open invoice"}
                  </Link>
                </div>
              ) : null}
              {detail.attachments.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-foreground-muted">
                    Attachments
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
                    {detail.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <a
                          href={`/api/dizlee/notifications/history/${detail.id}/attachments/${attachment.id}`}
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
              <div>
                <p className="text-sm font-medium text-foreground-muted">
                  Recipients
                </p>
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
