import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/options";
import {
  changePasswordForUser,
  PasswordFlowError,
} from "@/lib/auth/password-flow";
import type { AppSessionUser } from "@/lib/auth/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser: AppSessionUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role,
    opcoId: session.user.opcoId ?? null,
    partnerId: session.user.partnerId ?? null,
  };

  try {
    const body = await request.json();
    await changePasswordForUser(sessionUser, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PasswordFlowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to change password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
