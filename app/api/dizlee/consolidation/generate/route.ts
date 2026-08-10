/**
 * POST — Dizlee portal.
 * Start generation of a new period consolidation package.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { generateConsolidation } from "@/lib/dizlee/consolidation";

export async function POST(request: Request) {
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

    if (!body.month || !body.year || !body.opcoId) {
      return NextResponse.json(
        { error: "Period and OpCo are required." },
        { status: 400 },
      );
    }

    const result = await generateConsolidation({
      month: body.month,
      year: body.year,
      opcoId: body.opcoId,
      runByUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
