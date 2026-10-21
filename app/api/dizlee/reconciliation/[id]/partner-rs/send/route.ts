/**
 * POST — Dizlee portal.
 * Persist Partner RS PDF, notify Partner, upsert period row (resend replaces).
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { sendPartnerRsReport } from "@/lib/dizlee/partner-revenue-share";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
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

    const result = await sendPartnerRsReport({
      reconciliationId: Number(idRaw),
      actorUserId: user.id,
    });

    return NextResponse.json({
      data: {
        reportId: result.reportId,
        notificationId: result.notificationId,
        filename: result.filename,
        message: result.message,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
