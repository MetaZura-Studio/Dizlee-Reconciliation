/**
 * GET — Dizlee portal.
 * Whether outbound email (SMTP) is ready — no secrets returned.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { getEmailDeliveryReadiness } from "@/lib/auth/email-delivery-readiness";
import { requireDizleeSession } from "@/lib/dizlee/auth";

export async function GET() {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const data = await getEmailDeliveryReadiness();
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
