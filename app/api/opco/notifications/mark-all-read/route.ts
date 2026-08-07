/**
 * POST — OpCo portal.
 * Mark all OpCo inbox notifications as read.
 */

import { NextResponse } from "next/server";

import { getOpcoSession } from "@/lib/opco/auth";
import { markAllOpcoInboxNotificationsRead } from "@/lib/opco/queries/notifications";

export async function POST() {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await markAllOpcoInboxNotificationsRead({
      userId: BigInt(session.userId),
      opcoId: BigInt(session.opcoId),
    });
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to mark notifications as read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
