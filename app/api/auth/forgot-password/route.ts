/**
 * POST — Auth portal.
 * Request a password reset email for a registered email address.
 */

import { NextResponse } from "next/server";

import {
  PasswordFlowError,
  requestForgotPassword,
} from "@/lib/auth/password-flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await requestForgotPassword(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PasswordFlowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
