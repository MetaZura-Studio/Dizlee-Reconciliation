/**
 * POST — Admin portal.
 * Mark all Admin inbox notifications as read.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { markAllAdminInboxNotificationsRead } from "@/lib/admin/notifications";

export async function POST() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const data = await markAllAdminInboxNotificationsRead({
      userId: BigInt(user.id),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
