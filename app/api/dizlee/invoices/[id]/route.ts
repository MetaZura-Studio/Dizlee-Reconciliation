/**
 * GET — Dizlee portal.
 * Return full detail for a single invoice.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getInvoiceDetailForViewer } from "@/lib/dizlee/invoices";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  try {
    const result = await getInvoiceDetailForViewer(id, user.id);
    if (!result) {
      return jsonError(appErrorFromUnknown("Invoice not found", 404));
    }
    return NextResponse.json({
      data: result.detail,
      acknowledged: result.acknowledged,
    });
  } catch (error) {
    return jsonError(error);
  }
}
