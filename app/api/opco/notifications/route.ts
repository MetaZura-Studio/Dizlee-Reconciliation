/**
 * GET — OpCo portal.
 * List notifications for the signed-in OpCo user.
 */

import { NextResponse } from "next/server";

import { getOpcoSession } from "@/lib/opco/auth";
import {
  listOpcoInboxNotifications,
  parseOpcoInboxFilters,
} from "@/lib/opco/queries/notifications";

export async function GET(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filters = parseOpcoInboxFilters(new URL(request.url).searchParams);
  const result = await listOpcoInboxNotifications({
    userId: BigInt(session.userId),
    opcoId: BigInt(session.opcoId),
    filters,
  });

  return NextResponse.json({ result });
}
