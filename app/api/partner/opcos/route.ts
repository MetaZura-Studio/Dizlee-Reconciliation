/**
 * GET — Partner portal.
 * List OpCos the signed-in partner may submit reports and invoices to.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { getPartnerSession } from "@/lib/partner/auth";
import { getLinkedOpcosForPartner } from "@/lib/partner/queries/opcos";

export async function GET() {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const opcos = await getLinkedOpcosForPartner(BigInt(session.partnerId));

  return NextResponse.json({ opcos });
}
