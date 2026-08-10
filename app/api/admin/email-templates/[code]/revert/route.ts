/**
 * POST — Admin portal.
 * Revert a notification template to its last saved default content.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { revertEmailTemplate } from "@/lib/admin/email-templates";
import type { RevertEmailTemplateInput } from "@/lib/admin/validation/email-templates";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { code } = await context.params;
    const body = (await request.json()) as RevertEmailTemplateInput;
    const data = await revertEmailTemplate(
      decodeURIComponent(code),
      body,
      BigInt(user.id),
    );
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
