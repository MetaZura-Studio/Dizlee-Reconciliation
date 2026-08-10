/**
 * GET — Dizlee portal.
 * Return the count of unread Dizlee inbox notifications.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getUnreadInboxCount } from "@/lib/dizlee/notifications/inbox";

export async function GET() {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const count = await getUnreadInboxCount(user.id);
    return NextResponse.json({ data: { count } });
  } catch (error) {
    return jsonError(error);
  }
}
