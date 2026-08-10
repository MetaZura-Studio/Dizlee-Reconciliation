/**
 * GET — Dizlee portal.
 * List unread and read notifications in the Dizlee inbox.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  listInboxNotifications,
  parseInboxFilters,
} from "@/lib/dizlee/notifications/inbox";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
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
    return jsonError(error);
  }
}
