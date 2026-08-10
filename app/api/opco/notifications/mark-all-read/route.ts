/**
 * POST — OpCo portal.
 * Mark all OpCo inbox notifications as read.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import { markAllOpcoInboxNotificationsRead } from "@/lib/opco/queries/notifications";

export async function POST() {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const data = await markAllOpcoInboxNotificationsRead({
      userId: BigInt(session.userId),
      opcoId: BigInt(session.opcoId),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
