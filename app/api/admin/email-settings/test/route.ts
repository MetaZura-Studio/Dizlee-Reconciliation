/**
 * POST — Admin portal.
 * Send a test email using the configured SMTP settings.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { EmailSettingsError, sendTestEmail } from "@/lib/admin/email-settings";
import type { SendTestEmailInput } from "@/lib/admin/validation/email-settings";

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SendTestEmailInput;
    const data = await sendTestEmail(body, BigInt(user.id));
    return NextResponse.json({
      message: `Test email sent to ${data.recipient}.`,
      data,
    });
  } catch (error) {
    if (error instanceof EmailSettingsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to send test email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
