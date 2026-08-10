/**
 * GET — Partner portal.
 * Return invoice lifecycle events visible to the partner.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getPartnerSession } from "@/lib/partner/auth";
import { getPartnerInvoiceLifecycle } from "@/lib/partner/invoices/lifecycle";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid invoice id", 400));
  }

  const lifecycle = await getPartnerInvoiceLifecycle(
    BigInt(session.partnerId),
    BigInt(id),
  );

  if (!lifecycle) {
    return jsonError(appErrorFromUnknown("Invoice not found", 404));
  }

  return NextResponse.json({ lifecycle });
}
