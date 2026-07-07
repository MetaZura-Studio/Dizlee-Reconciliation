/**
 * Partner-scoped auth helpers.
 * Shahrukh owns this module — reads shared JWT via lib/auth/options only.
 */

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";

export type PartnerSession = {
  userId: string;
  email: string;
  name?: string | null;
  role: "partner";
  partnerId: string;
};

export function isPartnerRole(role: string): boolean {
  return role === "partner";
}

export async function getPartnerSession(): Promise<PartnerSession | null> {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    session.user.role !== "partner" ||
    !session.user.partnerId
  ) {
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: "partner",
    partnerId: session.user.partnerId,
  };
}

export async function requirePartnerSession(): Promise<PartnerSession> {
  const session = await getPartnerSession();

  if (!session) {
    redirect("/login?callbackUrl=/partner");
  }

  return session;
}
