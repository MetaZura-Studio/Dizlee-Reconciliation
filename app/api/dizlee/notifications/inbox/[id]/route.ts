import { NextResponse } from "next/server";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
