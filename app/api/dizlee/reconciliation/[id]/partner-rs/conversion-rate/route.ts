/**
 * GET — Dizlee portal.
 * System monthly conversion rate for Partner RS retention modal prefill.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getPartnerRsSystemConversionRate } from "@/lib/dizlee/partner-revenue-share";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id: idRaw } = await context.params;
    if (!/^\d+$/.test(idRaw)) {
      return NextResponse.json(
        { error: "Invalid reconciliation id." },
        { status: 400 },
      );
    }

    const data = await getPartnerRsSystemConversionRate(Number(idRaw));
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
