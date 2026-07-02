/**
 * OpCo-scoped auth helpers.
 * Shahrukh owns this module — reads shared JWT via lib/auth/options only.
 */

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";

export type OpcoSession = {
  userId: string;
  email: string;
  name?: string | null;
  role: "opco";
  opcoId: string;
};

export function isOpcoRole(role: string): boolean {
  return role === "opco";
}

export async function getOpcoSession(): Promise<OpcoSession | null> {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    session.user.role !== "opco" ||
    !session.user.opcoId
  ) {
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: "opco",
    opcoId: session.user.opcoId,
  };
}

export async function requireOpcoSession(): Promise<OpcoSession> {
  const session = await getOpcoSession();

  if (!session) {
    redirect("/login?callbackUrl=/opco");
  }

  return session;
}
