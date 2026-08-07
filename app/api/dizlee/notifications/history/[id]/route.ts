/**
 * GET — Dizlee portal.
 * Return detail for a sent notification history record.
 */

import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getNotificationHistoryDetail } from "@/lib/dizlee/notifications/history";

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
    const data = await getNotificationHistoryDetail(id);
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
