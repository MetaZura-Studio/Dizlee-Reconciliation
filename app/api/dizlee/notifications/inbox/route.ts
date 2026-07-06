import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listInboxNotifications,
  parseInboxFilters,
} from "@/lib/dizlee/notifications/inbox";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseInboxFilters(searchParams);
    const data = await listInboxNotifications({
      userId: user.id,
      page: filters.page,
      unreadOnly: filters.unreadOnly,
    });
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load inbox";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
