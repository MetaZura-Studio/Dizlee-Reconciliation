import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import type { AppSessionUser } from "@/lib/auth/types";

export type DizleeSessionUser = AppSessionUser & { role: "client" };

export async function requireDizleeSession(): Promise<DizleeSessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "client") {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: "client",
    opcoId: session.user.opcoId,
    partnerId: session.user.partnerId,
  };
}

export function isClientRole(role: string): boolean {
  return role === "client";
}
