/**
 * GET — OpCo portal.
 * Return the unread OpCo inbox notification count.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import { getOpcoUnreadInboxCount } from "@/lib/opco/queries/notifications";

export async function GET() {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  const unreadCount = await getOpcoUnreadInboxCount(
    BigInt(session.userId),
    BigInt(session.opcoId),
  );

  return NextResponse.json({ unreadCount });
}
