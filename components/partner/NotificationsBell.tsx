"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type NotificationsBellProps = {
  initialUnreadCount: number;
};

export function NotificationsBell({ initialUnreadCount }: NotificationsBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const refreshCount = useCallback(async () => {
    try {
      const response = await fetch("/api/partner/notifications/unread-count");
      const payload = (await response.json()) as { unreadCount?: number };

      if (response.ok) {
        setUnreadCount(payload.unreadCount ?? 0);
      }
    } catch {
      // Keep the last known count if refresh fails.
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      void refreshCount();
    };

    window.addEventListener("partner-inbox-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      window.removeEventListener("partner-inbox-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, [refreshCount]);

  return (
    <Link
      href="/partner/notifications"
      className="relative inline-flex items-center rounded border border-border-strong px-3 py-1.5 text-sm text-foreground-muted hover:bg-surface-muted"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
    >
      Notifications
      {unreadCount > 0 ? (
        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
