/**
 * GET, PATCH — Admin portal.
 * Read or update SMTP and outbound email configuration.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  EmailSettingsError,
  getEmailSettings,
  updateEmailSettings,
} from "@/lib/admin/email-settings";
import type { UpdateEmailSettingsInput } from "@/lib/admin/validation/email-settings";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getEmailSettings();
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof EmailSettingsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load email settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpdateEmailSettingsInput;
    const data = await updateEmailSettings(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof EmailSettingsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save email settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
