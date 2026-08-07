/**
 * GET — OpCo portal.
 * Return the unread OpCo inbox notification count.
 */

import { NextResponse } from "next/server";

import { getOpcoSession } from "@/lib/opco/auth";
import { getOpcoUnreadInboxCount } from "@/lib/opco/queries/notifications";

export async function GET() {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unreadCount = await getOpcoUnreadInboxCount(
    BigInt(session.userId),
    BigInt(session.opcoId),
  );

  return NextResponse.json({ unreadCount });
}
