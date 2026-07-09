import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { runAutomaticSubmissionReminders } from "@/lib/admin/automatic-submission-reminders";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await runAutomaticSubmissionReminders();
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run automatic submission reminders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
