import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import { getPartnerUnreadInboxCount } from "@/lib/partner/queries/notifications";

export async function GET() {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unreadCount = await getPartnerUnreadInboxCount(
    BigInt(session.userId),
    BigInt(session.partnerId),
  );

  return NextResponse.json({ unreadCount });
}
