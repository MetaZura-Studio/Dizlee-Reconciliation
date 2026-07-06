import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  ConsolidationError,
  generateConsolidation,
} from "@/lib/dizlee/consolidation";

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    if (error instanceof ConsolidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Failed to generate consolidation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
