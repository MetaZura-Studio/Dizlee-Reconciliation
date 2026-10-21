/**
 * GET — Partner portal.
 * Inline preview of a received Partner Revenue Share PDF (own Partner only).
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { getPartnerSession } from "@/lib/partner/auth";
import { getPersistedPartnerRevenueShareReport } from "@/lib/dizlee/partner-revenue-share";
import { buildStoredFilePreviewResponse } from "@/lib/platform/reports/preview-stored-file";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getPartnerSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
    }

    const row = await getPersistedPartnerRevenueShareReport(id, {
      partnerId: user.partnerId,
    });
    if (!row) {
      return NextResponse.json(
        { error: "Partner RS report not found." },
        { status: 404 },
      );
    }

    return buildStoredFilePreviewResponse(row.file);
  } catch (error) {
    return jsonError(error);
  }
}
