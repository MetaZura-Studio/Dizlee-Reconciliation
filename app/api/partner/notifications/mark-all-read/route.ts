/**
 * POST — Partner portal.
 * Mark all partner inbox notifications as read.
 */

import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import { markAllPartnerInboxNotificationsRead } from "@/lib/partner/queries/notifications";

export async function POST() {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await markAllPartnerInboxNotificationsRead({
      userId: BigInt(session.userId),
      partnerId: BigInt(session.partnerId),
    });
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to mark notifications as read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
