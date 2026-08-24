/**
 * POST — Dizlee portal.
 * Generate RS Excel, persist under revenue-share storage, upsert revenue_share_reports, download.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { generateAndPersistRevenueShareReport } from "@/lib/dizlee/revenue-share";
import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";

export async function POST(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as {
      month?: number;
      year?: number;
      opcoId?: string;
    };
    const month = Number(body.month);
    const year = Number(body.year);
    const opcoId = body.opcoId?.trim();
    if (
      !opcoId ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2000
    ) {
      return NextResponse.json(
        { error: "month, year, and opcoId are required." },
        { status: 400 },
      );
    }

    const result = await generateAndPersistRevenueShareReport({
      month,
      year,
      opcoId,
      actorUserId: user.id,
    });

    const headers = buildFileResponseHeaders({
      filename: result.filename,
      mimeType: result.mimeType,
      forceAttachment: true,
    });
    headers.set("X-Revenue-Share-Report-Id", String(result.report.id));

    return new NextResponse(new Uint8Array(result.buffer), { headers });
  } catch (error) {
    return jsonError(error);
  }
}
