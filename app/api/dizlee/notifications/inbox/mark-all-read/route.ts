/**
 * POST — Dizlee portal.
 * Mark all Dizlee inbox notifications as read.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { markAllInboxNotificationsRead } from "@/lib/dizlee/notifications/inbox";

export async function POST() {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const data = await markAllInboxNotificationsRead({ userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
