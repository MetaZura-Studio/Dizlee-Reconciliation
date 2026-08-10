/**
 * GET, POST — Admin portal.
 * List notification templates or create a new template.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  createEmailTemplate,
  listEmailTemplates,
} from "@/lib/admin/email-templates";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const templates = await listEmailTemplates();
    return NextResponse.json({ data: { templates } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const payload = (await request.json()) as unknown;
    const template = await createEmailTemplate(
      payload as Parameters<typeof createEmailTemplate>[0],
      BigInt(user.id),
    );
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
