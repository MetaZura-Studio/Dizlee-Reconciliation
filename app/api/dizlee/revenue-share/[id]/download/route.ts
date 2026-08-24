/**
 * GET — Dizlee portal.
 * Download a persisted Revenue Share Excel by id.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getPersistedRevenueShareReport } from "@/lib/dizlee/revenue-share";
import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";
import { readStoredObject } from "@/lib/platform/storage/object-storage";

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

    const buffer = await readStoredObject(row.file.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: buildFileResponseHeaders({
        filename: row.file.filename,
        mimeType:
          row.file.mimeType ??
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        forceAttachment: true,
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
