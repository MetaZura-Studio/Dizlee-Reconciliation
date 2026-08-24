/**
 * GET — Dizlee portal.
 * Inline preview of a persisted Revenue Share Excel by id.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getPersistedRevenueShareReport } from "@/lib/dizlee/revenue-share";
import { buildStoredFilePreviewResponse } from "@/lib/platform/reports/preview-stored-file";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
    }

    const row = await getPersistedRevenueShareReport(id);
    if (!row) {
      return NextResponse.json({ error: "RS report not found." }, { status: 404 });
    }

    return buildStoredFilePreviewResponse(row.file);
  } catch (error) {
    return jsonError(error);
  }
}
