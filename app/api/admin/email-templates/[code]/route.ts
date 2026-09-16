/**
 * GET, PATCH, DELETE — Admin portal.
 * Load, update, or soft-delete a single notification email template by code.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  deleteEmailTemplate,
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
    return unauthorized();
  }

  try {
    const { code } = await context.params;
    const data = await getEmailTemplate(decodeURIComponent(code));
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
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
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { code } = await context.params;
    await deleteEmailTemplate(decodeURIComponent(code), BigInt(user.id));
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return jsonError(error);
  }
}
