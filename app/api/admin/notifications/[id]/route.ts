/**
 * GET, DELETE — Admin portal.
 * Fetch or dismiss a single Admin inbox notification.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  dismissAdminInboxNotification,
  getAdminInboxNotificationDetail,
  markAdminInboxNotificationRead,
} from "@/lib/admin/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid notification id", 400));
  }

  try {
    const userId = BigInt(user.id);
    const notificationId = BigInt(id);
    await markAdminInboxNotificationRead({ userId, notificationId });
    const detail = await getAdminInboxNotificationDetail({
      userId,
      notificationId,
    });
    if (!detail) {
      return jsonError(appErrorFromUnknown("Notification not found", 404));
    }
    return NextResponse.json({ detail, markedRead: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid notification id", 400));
  }

  try {
    await dismissAdminInboxNotification({
      userId: BigInt(user.id),
      notificationId: BigInt(id),
    });
    return NextResponse.json({ message: "Notification dismissed" });
  } catch (error) {
    return jsonError(error);
  }
}
