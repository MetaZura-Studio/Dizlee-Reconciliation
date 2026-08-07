/**
 * POST — Auth portal.
 * Set a new password using a valid invite or reset token.
 */

import { NextResponse } from "next/server";

import {
  PasswordFlowError,
  setPasswordWithToken,
} from "@/lib/auth/password-flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await setPasswordWithToken(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PasswordFlowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to set password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
