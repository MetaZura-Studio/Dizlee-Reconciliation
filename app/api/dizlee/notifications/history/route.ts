/**
 * GET — Dizlee portal.
 * List sent notification broadcasts and delivery history.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listNotificationHistory,
  parseNotificationHistoryFilters,
} from "@/lib/dizlee/notifications/history";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseNotificationHistoryFilters(searchParams);
    const data = await listNotificationHistory(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
