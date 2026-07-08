import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import {
  listPartnerInboxNotifications,
  parsePartnerInboxFilters,
} from "@/lib/partner/queries/notifications";

export async function GET(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filters = parsePartnerInboxFilters(new URL(request.url).searchParams);
  const result = await listPartnerInboxNotifications({
    userId: BigInt(session.userId),
    partnerId: BigInt(session.partnerId),
    filters,
  });

  return NextResponse.json({ result });
}
