import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  EmailTemplateError,
  revertEmailTemplate,
} from "@/lib/admin/email-templates";
import type { RevertEmailTemplateInput } from "@/lib/admin/validation/email-templates";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    if (error instanceof EmailTemplateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to revert email template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
