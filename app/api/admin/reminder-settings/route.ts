import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getReminderSettings,
  ReminderSettingsError,
  updateReminderSettings,
} from "@/lib/admin/reminder-settings";
import type { UpdateReminderSettingsInput } from "@/lib/admin/validation/reminder-settings";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getReminderSettings();
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ReminderSettingsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load reminder settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpdateReminderSettingsInput;
    const data = await updateReminderSettings(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ReminderSettingsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save reminder settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
