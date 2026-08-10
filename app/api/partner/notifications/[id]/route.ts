/**
 * GET, DELETE — Partner portal.
 * Fetch or dismiss a single partner inbox notification.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getPartnerSession } from "@/lib/partner/auth";
import {
  dismissPartnerInboxNotification,
  getPartnerInboxNotificationDetail,
  markPartnerInboxNotificationRead,
} from "@/lib/partner/queries/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid notification id", 400));
  }

  try {
    const userId = BigInt(session.userId);
    const partnerId = BigInt(session.partnerId);
    const notificationId = BigInt(id);

    await markPartnerInboxNotificationRead({
      userId,
      partnerId,
      notificationId,
    });

    const detail = await getPartnerInboxNotificationDetail({
      userId,
      partnerId,
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
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid notification id", 400));
  }

  try {
    await dismissPartnerInboxNotification({
      userId: BigInt(session.userId),
      partnerId: BigInt(session.partnerId),
      notificationId: BigInt(id),
    });

    return NextResponse.json({ message: "Notification dismissed" });
  } catch (error) {
    return jsonError(error);
  }
}
