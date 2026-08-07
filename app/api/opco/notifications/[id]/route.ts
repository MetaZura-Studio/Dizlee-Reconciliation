/**
 * GET, DELETE — OpCo portal.
 * Fetch or dismiss a single OpCo inbox notification.
 */

import { NextResponse } from "next/server";

import { getOpcoSession } from "@/lib/opco/auth";
import {
  OpcoNotificationError,
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
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
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ detail, markedRead: true });
  } catch (error) {
    if (error instanceof OpcoNotificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load OpCo notification", error);
    return NextResponse.json({ error: "Failed to load notification" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  try {
    await dismissOpcoInboxNotification({
      userId: BigInt(session.userId),
      opcoId: BigInt(session.opcoId),
      notificationId: BigInt(id),
    });

    return NextResponse.json({ message: "Notification dismissed" });
  } catch (error) {
    if (error instanceof OpcoNotificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to dismiss OpCo notification", error);
    return NextResponse.json(
      { error: "Failed to dismiss notification" },
      { status: 500 },
    );
  }
}
