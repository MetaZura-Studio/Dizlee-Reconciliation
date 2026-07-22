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
  const [prevInitialUnreadCount, setPrevInitialUnreadCount] =
    useState(initialUnreadCount);

  if (initialUnreadCount !== prevInitialUnreadCount) {
    setPrevInitialUnreadCount(initialUnreadCount);
    setUnreadCount(initialUnreadCount);
  }

  const refreshCount = useCallback(async () => {
    try {
      const response = await fetch("/api/dizlee/notifications/unread-count");
      const payload = await response.json();
      if (response.ok) {
        setUnreadCount((payload.data as { count: number }).count);
      }
    } catch {
      // Ignore bell refresh errors silently.
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      void refreshCount();
    };
    const handleInboxUpdated = () => {
      void refreshCount();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("dizlee-inbox-updated", handleInboxUpdated);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("dizlee-inbox-updated", handleInboxUpdated);
    };
  }, [refreshCount]);

  return (
    <Link
      href="/dizlee/notifications?tab=inbox"
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
