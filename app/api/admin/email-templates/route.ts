import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  EmailTemplateError,
  listEmailTemplates,
} from "@/lib/admin/email-templates";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await listEmailTemplates();
    return NextResponse.json({ data: { templates } });
  } catch (error) {
    if (error instanceof EmailTemplateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load email templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
