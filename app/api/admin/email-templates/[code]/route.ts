/**
 * GET, PATCH — Admin portal.
 * Load or update a single notification email template by code.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  EmailTemplateError,
  getEmailTemplate,
  saveEmailTemplate,
} from "@/lib/admin/email-templates";
import type { SaveEmailTemplateInput } from "@/lib/admin/validation/email-templates";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await context.params;
    const data = await getEmailTemplate(decodeURIComponent(code));
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof EmailTemplateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load email template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await context.params;
    const body = (await request.json()) as SaveEmailTemplateInput;
    const data = await saveEmailTemplate(
      decodeURIComponent(code),
      body,
      BigInt(user.id),
    );
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof EmailTemplateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save email template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
