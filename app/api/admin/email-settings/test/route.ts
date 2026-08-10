/**
 * POST — Admin portal.
 * Send a test email using the configured SMTP settings.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { sendTestEmail } from "@/lib/admin/email-settings";
import type { SendTestEmailInput } from "@/lib/admin/validation/email-settings";

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as SendTestEmailInput;
    const data = await sendTestEmail(body, BigInt(user.id));
    return NextResponse.json({
      message: `Test email sent to ${data.recipient}.`,
      data,
    });
  } catch (error) {
    return jsonError(error);
  }
}
