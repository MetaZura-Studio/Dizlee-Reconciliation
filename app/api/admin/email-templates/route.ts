import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  createEmailTemplate,
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

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as unknown;
    const template = await createEmailTemplate(
      payload as Parameters<typeof createEmailTemplate>[0],
      BigInt(user.id),
    );
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailTemplateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create email template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
