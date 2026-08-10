/**
 * GET — Partner portal.
 * Return the unread partner inbox notification count.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { getPartnerSession } from "@/lib/partner/auth";
import { getPartnerUnreadInboxCount } from "@/lib/partner/queries/notifications";

export async function GET() {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const unreadCount = await getPartnerUnreadInboxCount(
    BigInt(session.userId),
    BigInt(session.partnerId),
  );

  return NextResponse.json({ unreadCount });
}
