import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { NotificationError } from "@/lib/dizlee/notifications/intimations";
import {
  getReminderSettings,
  listReminderLanes,
  parseReminderFilters,
  sendReportReminders,
} from "@/lib/dizlee/notifications/reminders";
import { getReportFilterOptions } from "@/lib/dizlee/reports-monitoring";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReminderFilters(searchParams);
    const [data, settings, filterOptions] = await Promise.all([
      listReminderLanes(filters),
      getReminderSettings(),
      getReportFilterOptions(),
    ]);

    return NextResponse.json({ data, settings, filterOptions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load report reminders";
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
      month?: number;
      year?: number;
      laneKeys?: string[];
      target?: "opco" | "partner" | "both";
      subject?: string;
      body?: string;
    };

    if (!body.month || !body.year) {
      return NextResponse.json({ error: "Period is required." }, { status: 400 });
    }

    const target = body.target ?? "both";
    if (target !== "opco" && target !== "partner" && target !== "both") {
      return NextResponse.json({ error: "Invalid reminder target." }, { status: 400 });
    }

    const result = await sendReportReminders({
      input: {
        month: body.month,
        year: body.year,
        laneKeys: body.laneKeys ?? [],
        target,
        subject: body.subject,
        body: body.body,
      },
      fromUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof NotificationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Failed to send report reminders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
