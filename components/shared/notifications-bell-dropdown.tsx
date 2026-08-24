/**
 * Shared floating notifications panel opened from the portal bell.
 * Lists recent inbox items and navigates to a related page (or inbox) on click.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { IconBell } from "@/components/ui/icons";
import {
  formatNotificationTime,
  resolveNotificationHref,
  type NotificationPortal,
} from "@/lib/platform/notification-deep-links";
import { cn, ui } from "@/lib/ui/classes";

export type BellNotificationItem = {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedAt: string;
  fromName?: string;
  isRead: boolean;
};

type NotificationsBellDropdownProps = {
  portal: NotificationPortal;
  inboxHref: string;
  listUrl: string;
  detailUrl: (id: string) => string;
  unreadCountUrl: string;
  inboxUpdatedEvent: string;
  initialUnreadCount?: number;
  /** Extract unread count from unread-count JSON. */
  parseUnreadCount: (payload: unknown) => number;
  /** Extract list items from list JSON. */
  parseListItems: (payload: unknown) => BellNotificationItem[];
};

function BellBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-primary-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function NotificationsBellDropdown({
  portal,
  inboxHref,
  listUrl,
  detailUrl,
  unreadCountUrl,
  inboxUpdatedEvent,
  initialUnreadCount = 0,
  parseUnreadCount,
  parseListItems,
}: NotificationsBellDropdownProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [prevInitial, setPrevInitial] = useState(initialUnreadCount);
  const [items, setItems] = useState<BellNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  if (initialUnreadCount !== prevInitial) {
    setPrevInitial(initialUnreadCount);
    setUnreadCount(initialUnreadCount);
  }

  const refreshCount = useCallback(async () => {
    try {
      const response = await fetch(unreadCountUrl);
      const payload: unknown = await response.json();
      if (response.ok) {
        setUnreadCount(parseUnreadCount(payload));
      }
    } catch {
      // Keep last known count.
    }
  }, [parseUnreadCount, unreadCountUrl]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(listUrl);
      const payload: unknown = await response.json();
      if (!response.ok) {
        setError("Could not load notifications.");
        setItems([]);
        return;
      }
      setItems(parseListItems(payload).slice(0, 8));
    } catch {
      setError("Could not load notifications.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [listUrl, parseListItems]);

  useEffect(() => {
    const handleUpdate = () => {
      void refreshCount();
      if (open) {
        void loadItems();
      }
    };
    window.addEventListener(inboxUpdatedEvent, handleUpdate);
    window.addEventListener("focus", handleUpdate);
    return () => {
      window.removeEventListener(inboxUpdatedEvent, handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, [inboxUpdatedEvent, loadItems, open, refreshCount]);

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    void loadItems();
    function updatePosition() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      setPanelPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [loadItems, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        const panel = document.getElementById("notifications-bell-panel");
        if (panel?.contains(event.target as Node)) {
          return;
        }
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleItemClick(item: BellNotificationItem) {
    setNavigatingId(item.id);
    let body: string | null = item.bodyPreview;
    try {
      const response = await fetch(detailUrl(item.id));
      if (response.ok) {
        const payload = (await response.json()) as {
          detail?: { body?: string };
          data?: { body?: string };
        };
        body = payload.detail?.body ?? payload.data?.body ?? body;
      }
      setUnreadCount((count) => Math.max(0, count - (item.isRead ? 0 : 1)));
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, isRead: true } : row,
        ),
      );
      window.dispatchEvent(new Event(inboxUpdatedEvent));
    } catch {
      // Still navigate even if mark-read fails.
    }

    const href = resolveNotificationHref(
      portal,
      {
        id: item.id,
        subject: item.subject,
        bodyPreview: item.bodyPreview,
        body,
      },
      inboxHref,
    );

    setOpen(false);
    setNavigatingId(null);
    router.push(href);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          ui.iconButton,
          "relative text-foreground-muted",
          open && "border-primary bg-primary-muted text-primary",
        )}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <IconBell className="h-5 w-5" />
        <BellBadge count={unreadCount} />
      </button>

      {open && panelPos ? (
        <div
          id="notifications-bell-panel"
          role="dialog"
          aria-label="Notifications"
          style={{ top: panelPos.top, right: panelPos.right }}
          className="fixed z-[60] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[22px] border border-border bg-surface shadow-[var(--shadow-md)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">
              Notifications
            </h2>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-primary-muted px-2 py-0.5 text-xs font-semibold text-primary">
                {unreadCount} new
              </span>
            ) : null}
          </div>

          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-foreground-muted">
                Loading…
              </p>
            ) : error ? (
              <p className="px-4 py-8 text-center text-sm text-danger">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-foreground-muted">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={navigatingId === item.id}
                      onClick={() => void handleItemClick(item)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted/80",
                        !item.isRead && "bg-primary-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          item.isRead
                            ? "bg-surface-muted text-foreground-muted"
                            : "bg-primary-muted text-primary",
                        )}
                        aria-hidden
                      >
                        <IconBell className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">
                          {item.subject}
                        </span>
                        {item.bodyPreview ? (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-foreground-muted">
                            {item.bodyPreview}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[11px] text-foreground-subtle">
                          {formatNotificationTime(item.receivedAt)}
                          {item.fromName ? ` · ${item.fromName}` : ""}
                        </span>
                      </span>
                      {!item.isRead ? (
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border p-2">
            <Link
              href={inboxHref}
              className="flex w-full items-center justify-center rounded-2xl bg-surface-muted px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary-muted hover:text-primary"
              onClick={() => setOpen(false)}
            >
              See all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Helpers for common `{ result: { items } }` / `{ unreadCount }` payloads. */
export function parseResultListItems(payload: unknown): BellNotificationItem[] {
  const data = payload as {
    result?: { items?: BellNotificationItem[] };
  };
  return Array.isArray(data.result?.items) ? data.result.items : [];
}

export function parseUnreadCountField(payload: unknown): number {
  const data = payload as { unreadCount?: number };
  return typeof data.unreadCount === "number" ? data.unreadCount : 0;
}

export function parseDizleeInboxList(payload: unknown): BellNotificationItem[] {
  const data = payload as { data?: { items?: BellNotificationItem[] } };
  return Array.isArray(data.data?.items) ? data.data.items : [];
}

export function parseDizleeUnreadCount(payload: unknown): number {
  const data = payload as { data?: { count?: number } };
  return typeof data.data?.count === "number" ? data.data.count : 0;
}
