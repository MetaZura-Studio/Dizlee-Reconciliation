/**
 * GET — Dizlee portal.
 * Return detail for a sent notification history record.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getNotificationHistoryDetail } from "@/lib/dizlee/notifications/history";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const data = await getNotificationHistoryDetail(id);
    if (!data) {
      return jsonError(appErrorFromUnknown("Notification not found.", 404));
    }
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
