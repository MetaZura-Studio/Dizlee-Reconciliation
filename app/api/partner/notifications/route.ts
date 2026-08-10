/**
 * GET — Partner portal.
 * List notifications for the signed-in partner user.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { getPartnerSession } from "@/lib/partner/auth";
import {
  listPartnerInboxNotifications,
  parsePartnerInboxFilters,
} from "@/lib/partner/queries/notifications";

export async function GET(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const filters = parsePartnerInboxFilters(new URL(request.url).searchParams);
  const result = await listPartnerInboxNotifications({
    userId: BigInt(session.userId),
    partnerId: BigInt(session.partnerId),
    filters,
  });

  return NextResponse.json({ result });
}
