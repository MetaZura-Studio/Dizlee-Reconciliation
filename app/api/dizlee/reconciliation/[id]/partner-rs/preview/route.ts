/**
 * POST — Dizlee portal.
 * Build Partner RS PDF for a completed reconciliation (preview only; no send).
 * Body: { line1?: { enabled, percent }, line2?: { enabled, percent } }
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { previewPartnerRsReport } from "@/lib/dizlee/partner-revenue-share";
import { parsePartnerRsRetentionOptions } from "@/lib/dizlee/partner-revenue-share.shared";
import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";

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

    const result = await previewPartnerRsReport(Number(idRaw), retentionOptions);
    const headers = buildFileResponseHeaders({
      filename: result.filename,
      mimeType: result.mimeType,
      forceAttachment: false,
    });

    return new NextResponse(new Uint8Array(result.buffer), { headers });
  } catch (error) {
    return jsonError(error);
  }
}
