/**
 * POST — Dizlee portal.
 * Start generation of a new period consolidation package.
 */

import { NextResponse } from "next/server";
import {
  jsonError,
  unauthorized,
  validationFailed,
} from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { generateConsolidation } from "@/lib/dizlee/consolidation";
import { generateConsolidationBodySchema } from "@/lib/dizlee/validation/api-bodies";

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return validationFailed();
    }

    const parsed = generateConsolidationBodySchema.safeParse(raw);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten().fieldErrors);
    }

    const result = await generateConsolidation({
      month: parsed.data.month,
      year: parsed.data.year,
      opcoId: parsed.data.opcoId,
      runByUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
