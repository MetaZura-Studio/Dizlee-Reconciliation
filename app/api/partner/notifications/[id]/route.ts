import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import {
  PartnerNotificationError,
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
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
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ detail, markedRead: true });
  } catch (error) {
    if (error instanceof PartnerNotificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load partner notification", error);
    return NextResponse.json({ error: "Failed to load notification" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  try {
    await dismissPartnerInboxNotification({
      userId: BigInt(session.userId),
      partnerId: BigInt(session.partnerId),
      notificationId: BigInt(id),
    });

    return NextResponse.json({ message: "Notification dismissed" });
  } catch (error) {
    if (error instanceof PartnerNotificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to dismiss partner notification", error);
    return NextResponse.json(
      { error: "Failed to dismiss notification" },
      { status: 500 },
    );
  }
}
