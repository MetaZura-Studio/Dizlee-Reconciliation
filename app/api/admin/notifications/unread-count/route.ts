/**
 * GET — Admin portal.
 * Return the unread Admin inbox notification count.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { getAdminUnreadInboxCount } from "@/lib/admin/notifications";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  const unreadCount = await getAdminUnreadInboxCount(BigInt(user.id));
  return NextResponse.json({ unreadCount });
}
