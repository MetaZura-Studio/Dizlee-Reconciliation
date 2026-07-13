import type { AppRole } from "@/lib/auth/types";
import type { AuthLoginScope } from "@/lib/auth/scopes";
import { writePlatformAuditLog } from "@/lib/platform/audit-log";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  client: "Dizlee",
  opco: "OpCo",
  partner: "Partner",
};

export function formatSessionAuditMessage(params: {
  action: "USER_LOGIN" | "USER_LOGOUT";
  role: AppRole;
  email: string;
  scope?: AuthLoginScope;
}): string {
  const roleLabel = ROLE_LABELS[params.role];
  const verb = params.action === "USER_LOGIN" ? "signed in" : "signed out";
  const scopeSuffix =
    params.action === "USER_LOGIN" && params.scope === "admin"
      ? " via admin login"
      : "";

  return `${roleLabel} user ${verb}${scopeSuffix} (${params.email})`;
}

export async function writeUserSessionAuditLog(params: {
  userId: bigint;
  action: "USER_LOGIN" | "USER_LOGOUT";
  role: AppRole;
  email: string;
  scope?: AuthLoginScope;
}): Promise<void> {
  await writePlatformAuditLog({
    actorUserId: params.userId,
    action: params.action,
    entityType: "USER",
    entityId: params.userId,
    message: formatSessionAuditMessage(params),
    metadata: {
      role: params.role,
      email: params.email,
      ...(params.scope ? { scope: params.scope } : {}),
    },
  });
}
