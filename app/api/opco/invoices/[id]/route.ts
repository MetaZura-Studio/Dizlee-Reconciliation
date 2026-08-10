/**
 * GET — OpCo portal.
 * Return detail for a single invoice visible to the OpCo.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getOpcoSession } from "@/lib/opco/auth";
import { getOpcoInvoiceDetailForViewer } from "@/lib/opco/queries/invoices";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid invoice id", 400));
  }

  const result = await getOpcoInvoiceDetailForViewer(
    BigInt(session.opcoId),
    BigInt(id),
    BigInt(session.userId),
  );

  if (!result) {
    return jsonError(appErrorFromUnknown("Invoice not found", 404));
  }

  return NextResponse.json({
    detail: result.detail,
    acknowledged: result.acknowledged,
  });
}
