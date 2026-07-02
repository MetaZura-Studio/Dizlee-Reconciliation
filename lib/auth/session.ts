import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import type { AppSessionUser } from "@/lib/auth/types";

export async function getAppSession() {
  return getServerSession(authOptions);
}

export async function getAppSessionUser(): Promise<AppSessionUser | null> {
  const session = await getAppSession();
  if (!session?.user?.id || !session.user.role) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role,
    opcoId: session.user.opcoId,
    partnerId: session.user.partnerId,
  };
}
