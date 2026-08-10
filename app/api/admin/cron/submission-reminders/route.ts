/**
 * GET — Admin portal.
 * Trigger scheduled report and invoice submission reminder emails (cron-protected).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

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
    return unauthorized();
  }

  try {
    const data = await runAutomaticSubmissionReminders();
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
