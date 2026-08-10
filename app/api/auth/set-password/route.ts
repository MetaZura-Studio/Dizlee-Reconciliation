/**
 * POST — Auth portal.
 * Set a new password using a valid invite or reset token.
 */

import { NextResponse } from "next/server";
import { jsonError } from "@/lib/errors/respond";

import { setPasswordWithToken } from "@/lib/auth/password-flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await setPasswordWithToken(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
