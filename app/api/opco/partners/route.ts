/**
 * GET — OpCo portal.
 * List partners linked to the signed-in OpCo for submissions.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import { getLinkedPartnersForOpco } from "@/lib/opco/queries/partners";

export async function GET() {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  const partners = await getLinkedPartnersForOpco(BigInt(session.opcoId));

  return NextResponse.json({ partners });
}
