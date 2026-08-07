/**
 * GET — Partner portal.
 * Return invoice lifecycle events visible to the partner.
 */

import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import { getPartnerInvoiceLifecycle } from "@/lib/partner/invoices/lifecycle";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const lifecycle = await getPartnerInvoiceLifecycle(
    BigInt(session.partnerId),
    BigInt(id),
  );

  if (!lifecycle) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ lifecycle });
}
