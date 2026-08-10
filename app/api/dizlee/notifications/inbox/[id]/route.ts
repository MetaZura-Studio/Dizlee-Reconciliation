/**
 * GET — Dizlee portal.
 * Mark a notification read and return its detail for the Dizlee inbox.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getInboxNotificationDetail,
  markInboxNotificationRead,
} from "@/lib/dizlee/notifications/inbox";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    await markInboxNotificationRead({
      userId: user.id,
      notificationId: id,
    });
    const data = await getInboxNotificationDetail({
      userId: user.id,
      notificationId: id,
    });
    if (!data) {
      return jsonError(appErrorFromUnknown("Notification not found.", 404));
    }
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
