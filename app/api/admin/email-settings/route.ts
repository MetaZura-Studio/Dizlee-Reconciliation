/**
 * GET, PATCH — Admin portal.
 * Read or update SMTP and outbound email configuration.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getEmailSettings,
  updateEmailSettings,
} from "@/lib/admin/email-settings";
import type { UpdateEmailSettingsInput } from "@/lib/admin/validation/email-settings";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const data = await getEmailSettings();
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as UpdateEmailSettingsInput;
    const data = await updateEmailSettings(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
