/**
 * GET, DELETE — OpCo portal.
 * Fetch or dismiss a single OpCo inbox notification.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getOpcoSession } from "@/lib/opco/auth";
import {
  dismissOpcoInboxNotification,
  getOpcoInboxNotificationDetail,
  markOpcoInboxNotificationRead,
} from "@/lib/opco/queries/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid notification id", 400));
  }

  try {
    const userId = BigInt(session.userId);
    const opcoId = BigInt(session.opcoId);
    const notificationId = BigInt(id);

    await markOpcoInboxNotificationRead({
      userId,
      opcoId,
      notificationId,
    });

    const detail = await getOpcoInboxNotificationDetail({
      userId,
      opcoId,
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
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid notification id", 400));
  }

  try {
    await dismissOpcoInboxNotification({
      userId: BigInt(session.userId),
      opcoId: BigInt(session.opcoId),
      notificationId: BigInt(id),
    });

    return NextResponse.json({ message: "Notification dismissed" });
  } catch (error) {
    return jsonError(error);
  }
}
