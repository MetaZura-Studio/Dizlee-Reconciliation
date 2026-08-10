/**
 * POST — Partner portal.
 * Mark all partner inbox notifications as read.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { getPartnerSession } from "@/lib/partner/auth";
import { markAllPartnerInboxNotificationsRead } from "@/lib/partner/queries/notifications";

export async function POST() {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const data = await markAllPartnerInboxNotificationsRead({
      userId: BigInt(session.userId),
      partnerId: BigInt(session.partnerId),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
