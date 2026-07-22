"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { IconBell } from "@/components/ui/icons";

type NotificationsBellProps = {
  initialUnreadCount?: number;
};

export function NotificationsBell({
  initialUnreadCount = 0,
}: NotificationsBellProps) {
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
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

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
      className="relative inline-flex items-center rounded-md p-2 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
      title="Notifications inbox"
    >
      <IconBell className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
