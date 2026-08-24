/**
 * POST — OpCo portal.
 * Ask Admin to add OpCo–Partner links for names found in an unsaved report file.
 */

import { NextResponse } from "next/server";
import {
  jsonError,
  unauthorized,
  validationFailed,
} from "@/lib/errors/respond";

import { assertRateLimit } from "@/lib/auth/rate-limit";
import { getOpcoSession } from "@/lib/opco/auth";
import { requestPartnerLinkFromOpco } from "@/lib/opco/queries/request-partner-link";
import { requestPartnerLinkSchema } from "@/lib/opco/validation/request-partner-link";

export async function POST(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  try {
    assertRateLimit({
      key: `opco-link-request:${session.userId}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as unknown;
    const parsed = requestPartnerLinkSchema.safeParse(body);

    if (!parsed.success) {
      return validationFailed(parsed.error.flatten().fieldErrors);
    }

    await requestPartnerLinkFromOpco({
      opcoId: BigInt(session.opcoId),
      userId: BigInt(session.userId),
      input: parsed.data,
    });

    return NextResponse.json({
      message: "Admin has been notified. You can upload after the link is added.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
