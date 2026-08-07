/**
 * Admin API route authentication — returns session user or null (no redirect).
 * Pair with 401 responses in `/api/admin/*` handlers.
 */
import { getServerSession } from "next-auth";

import { isAdminRole } from "@/lib/admin/auth";
import { authOptions } from "@/lib/auth/options";
import type { AdminSessionUser } from "@/lib/admin/auth";

export async function requireAdminApiSession(): Promise<AdminSessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: "admin",
    opcoId: session.user.opcoId,
    partnerId: session.user.partnerId,
  };
}
