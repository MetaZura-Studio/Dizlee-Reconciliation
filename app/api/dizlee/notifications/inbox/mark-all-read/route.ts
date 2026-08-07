/**
 * POST — Dizlee portal.
 * Mark all Dizlee inbox notifications as read.
 */

import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { markAllInboxNotificationsRead } from "@/lib/dizlee/notifications/inbox";

export async function POST() {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await markAllInboxNotificationsRead({ userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to mark notifications as read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
