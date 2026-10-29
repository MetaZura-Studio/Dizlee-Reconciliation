/**
 * PATCH — Dizlee portal.
 * Enable or disable Partner invoice upload for one partner.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { setPartnerInvoiceUploadEnabled } from "@/lib/dizlee/partner-invoice-access";
import { jsonError, unauthorized } from "@/lib/errors/respond";

const bodySchema = z.object({
  enabled: z.boolean(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = await setPartnerInvoiceUploadEnabled({
      partnerId: id,
      enabled: parsed.data.enabled,
      actorUserId: user.id,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
