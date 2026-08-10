/**
 * POST — Dizlee portal.
 * Record payment/settlement for Dizlee → OpCo or Partner → Dizlee invoices.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { markInvoicePaymentDone } from "@/lib/dizlee/invoices";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  try {
    const data = await markInvoicePaymentDone(id, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
