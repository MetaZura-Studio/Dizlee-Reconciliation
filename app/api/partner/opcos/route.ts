import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import { getLinkedOpcosForPartner } from "@/lib/partner/queries/opcos";

export async function GET() {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const opcos = await getLinkedOpcosForPartner(BigInt(session.partnerId));

  return NextResponse.json({ opcos });
}
