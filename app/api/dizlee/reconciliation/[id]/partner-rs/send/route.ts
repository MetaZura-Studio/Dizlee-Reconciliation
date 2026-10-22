/**
 * POST — Dizlee portal.
 * Persist Partner RS PDF, notify Partner, upsert period row (resend replaces).
 * Body: { includeRetention5?: boolean, includeRetention10?: boolean }
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { sendPartnerRsReport } from "@/lib/dizlee/partner-revenue-share";
import { parsePartnerRsRetentionOptions } from "@/lib/dizlee/partner-revenue-share.shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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

    const body = await request.json().catch(() => ({}));
    const retentionOptions = parsePartnerRsRetentionOptions(body);

    const result = await sendPartnerRsReport({
      reconciliationId: Number(idRaw),
      actorUserId: user.id,
      retentionOptions,
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
