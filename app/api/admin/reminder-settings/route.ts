/**
 * GET, PATCH — Admin portal.
 * Read or update automated submission reminder schedules.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getReminderSettings,
  updateReminderSettings,
} from "@/lib/admin/reminder-settings";
import type { UpdateReminderSettingsInput } from "@/lib/admin/validation/reminder-settings";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const data = await getReminderSettings();
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
    const body = (await request.json()) as UpdateReminderSettingsInput;
    const data = await updateReminderSettings(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
