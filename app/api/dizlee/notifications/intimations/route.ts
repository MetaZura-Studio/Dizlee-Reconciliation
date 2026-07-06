import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getIntimationFormOptions,
  listIntimations,
  NotificationError,
  parseIntimationListFilters,
  sendIntimationToOpcos,
} from "@/lib/dizlee/notifications/intimations";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseIntimationListFilters(searchParams);
    const [data, formOptions] = await Promise.all([
      listIntimations(filters),
      getIntimationFormOptions(),
    ]);

    return NextResponse.json({ data, formOptions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load intimations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      subject?: string;
      message?: string;
      body?: string;
      opcoIds?: string[];
      priority?: string | null;
      expiresAt?: string | null;
    };

    const result = await sendIntimationToOpcos({
      input: {
        subject: body.subject ?? "",
        body: body.body ?? body.message ?? "",
        opcoIds: body.opcoIds ?? [],
        priority: body.priority,
        expiresAt: body.expiresAt,
      },
      fromUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof NotificationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Failed to send notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
