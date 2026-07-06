import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getUnreadInboxCount } from "@/lib/dizlee/notifications/inbox";

export async function GET() {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await getUnreadInboxCount(user.id);
    return NextResponse.json({ data: { count } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load unread count";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
