/**
 * GET — Dizlee portal.
 * List sent notification broadcasts and delivery history.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listNotificationHistory,
  parseNotificationHistoryFilters,
} from "@/lib/dizlee/notifications/history";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseNotificationHistoryFilters(searchParams);
    const data = await listNotificationHistory(filters);
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load notification history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
