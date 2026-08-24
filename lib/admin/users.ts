/**
 * Admin user lifecycle — list/filter, create, update, soft delete, password invite flow.
 * Admin role users are managed separately; opco/partner/client scoped to org assignments.
 */
import type { Prisma } from "@prisma/client";

import { issuePasswordResetForUser } from "@/lib/auth/password-flow";
import { writeUserAuditLog } from "@/lib/admin/audit";
import { getLookupId } from "@/lib/admin/lookups";
import type {
  AdminUserRole,
  AdminUserStatus,
  UserListFilters,
  UserListItem,
  UserListResult,
  UserSortField,
  SortDirection,
} from "@/lib/admin/users.shared";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/admin/validation/users";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export type {
  AdminUserRole,
  AdminUserStatus,
  SortDirection,
  UserListFilters,
  UserListItem,
  UserListResult,
  UserSortField,
} from "@/lib/admin/users.shared";

export { parseUserListFilters } from "@/lib/admin/users.shared";

export class UserActionError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("UserActionError", keyOrMessage, status);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapRoleCode(code: string): AdminUserRole {
  const role = code.toLowerCase();
  if (role === "client" || role === "opco" || role === "partner") {
    return role;
  }
  throw new Error(`Unsupported assignable role: ${code}`);
}

function mapUserRow(user: {
  id: bigint;
  name: string | null;
  email: string;
  lastLoginAt: Date | null;
  opcoId: bigint | null;
  partnerId: bigint | null;
  role: { code: string };
  status: { code: string };
  opco: { name: string } | null;
  partner: { name: string } | null;
}): UserListItem {
  return {
    id: user.id.toString(),
    name: user.name?.trim() || "—",
    email: user.email,
    role: mapRoleCode(user.role.code),
    status: user.status.code as AdminUserStatus,
    opcoId: user.opcoId?.toString() ?? null,
    opcoName: user.opco?.name ?? null,
    partnerId: user.partnerId?.toString() ?? null,
    partnerName: user.partner?.name ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

function buildUserListWhere(filters: UserListFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    isDeleted: false,
    role: {
      code: { not: "ADMIN" },
      lookupType: { code: "USER_ROLE" },
    },
  };

  if (filters.search.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (filters.role !== "all") {
    where.role = {
      code: filters.role.toUpperCase(),
      lookupType: { code: "USER_ROLE" },
    };
  }

  if (filters.status !== "all") {
    where.status = {
      code: filters.status,
      lookupType: { code: "USER_STATUS" },
    };
  }

  return where;
}

function buildUserOrderBy(
  sortBy: UserSortField,
  sortDir: SortDirection,
): Prisma.UserOrderByWithRelationInput {
  const direction = sortDir === "asc" ? "asc" : "desc";

  switch (sortBy) {
    case "email":
      return { email: direction };
    case "role":
      return { role: { code: direction } };
    case "status":
      return { status: { code: direction } };
    case "name":
    default:
      return { name: direction };
  }
}

async function resolveRoleAndStatusIds(input: {
  role: AdminUserRole;
  status: AdminUserStatus;
}): Promise<{ roleId: number; statusId: number }> {
  const [roleId, statusId] = await Promise.all([
    getLookupId("USER_ROLE", input.role.toUpperCase()),
    getLookupId("USER_STATUS", input.status),
  ]);

  return { roleId, statusId };
}

async function assertEmailAvailable(
  email: string,
  excludeUserId?: bigint,
): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeleted: true },
  });

  if (existing && existing.id !== excludeUserId) {
    throw new UserActionError("A user with this email already exists");
  }
}

async function resolveOrgLinks(input: {
  role: AdminUserRole;
  opcoId?: string | null;
  partnerId?: string | null;
}): Promise<{ opcoId: bigint | null; partnerId: bigint | null }> {
  if (input.role === "client") {
    return { opcoId: null, partnerId: null };
  }

  if (input.role === "opco") {
    if (!input.opcoId) {
      throw new UserActionError("Select an OpCo");
    }

    const opco = await prisma.opco.findFirst({
      where: { id: BigInt(input.opcoId), isDeleted: false },
      select: { id: true },
    });
    if (!opco) {
      throw new UserActionError("Selected OpCo was not found", 404);
    }

    return { opcoId: opco.id, partnerId: null };
  }

  if (!input.partnerId) {
    throw new UserActionError("Select a Partner");
  }

  const partner = await prisma.partner.findFirst({
    where: { id: BigInt(input.partnerId), isDeleted: false },
    select: { id: true },
  });
  if (!partner) {
    throw new UserActionError("Selected Partner was not found", 404);
  }

  return { opcoId: null, partnerId: partner.id };
}

export async function listUsers(filters: UserListFilters): Promise<UserListResult> {
  const where = buildUserListWhere(filters);
  const orderBy = buildUserOrderBy(filters.sortBy, filters.sortDir);
  const skip = (filters.page - 1) * filters.pageSize;

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: filters.pageSize,
      include: {
        role: true,
        status: true,
        opco: { select: { name: true } },
        partner: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    items: rows.map(mapUserRow),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    filters,
  };
}

export type CreateUserResult = UserListItem & {
  inviteEmail: {
    sent: boolean;
    devPreviewUrl?: string;
  };
};

export async function createUser(
  rawInput: CreateUserInput,
  actorUserId: string,
): Promise<CreateUserResult> {
  const parsed = createUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new UserActionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const input = parsed.data;
  const email = normalizeEmail(input.email);
  await assertEmailAvailable(email);

  const { roleId, statusId } = await resolveRoleAndStatusIds({
    role: input.role,
    status: input.status,
  });
  const { opcoId, partnerId } = await resolveOrgLinks(input);
  const actorId = BigInt(actorUserId);

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      roleId,
      statusId,
      opcoId,
      partnerId,
      passwordHash: null,
      createdByUserId: actorId,
      updatedByUserId: actorId,
    },
    include: {
      role: true,
      status: true,
      opco: { select: { name: true } },
      partner: { select: { name: true } },
    },
  });

  const { emailResult } = await issuePasswordResetForUser(user.id, "invite");

  await writeUserAuditLog({
    actorUserId: actorId,
    action: "USER_CREATED",
    userId: user.id,
    message: `User created: ${user.email}`,
    metadata: {
      email: user.email,
      name: user.name,
      role: input.role,
      status: input.status,
      opcoId: user.opcoId?.toString() ?? null,
      partnerId: user.partnerId?.toString() ?? null,
    },
  });

  return {
    ...mapUserRow(user),
    inviteEmail: {
      sent: emailResult.sent,
      devPreviewUrl: emailResult.devPreviewUrl,
    },
  };
}

async function getEditableUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: BigInt(userId), isDeleted: false },
    include: {
      role: true,
      status: true,
      opco: { select: { name: true } },
      partner: { select: { name: true } },
    },
  });

  if (!user) {
    throw new UserActionError("User not found", 404);
  }

  if (user.role.code === "ADMIN") {
    throw new UserActionError("Admin accounts cannot be managed here", 403);
  }

  return user;
}

export async function updateUser(
  userId: string,
  rawInput: UpdateUserInput,
  actorUserId: string,
): Promise<UserListItem> {
  const existing = await getEditableUser(userId);

  const parsed = updateUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new UserActionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const input = parsed.data;
  const email = normalizeEmail(input.email);

  if (email !== existing.email) {
    await assertEmailAvailable(email, existing.id);
  }

  const { roleId, statusId } = await resolveRoleAndStatusIds({
    role: input.role,
    status: input.status,
  });
  const { opcoId, partnerId } = await resolveOrgLinks(input);

  const before = mapUserRow(existing);

  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      email,
      name: input.name.trim(),
      roleId,
      statusId,
      opcoId,
      partnerId,
      updatedByUserId: BigInt(actorUserId),
    },
    include: {
      role: true,
      status: true,
      opco: { select: { name: true } },
      partner: { select: { name: true } },
    },
  });

  const after = mapUserRow(user);

  await writeUserAuditLog({
    actorUserId: BigInt(actorUserId),
    action: "USER_UPDATED",
    userId: user.id,
    message: `User updated: ${user.email}`,
    metadata: { before, after },
  });

  return after;
}

export async function deleteUser(
  userId: string,
  actorUserId: string,
): Promise<void> {
  if (userId === actorUserId) {
    throw new UserActionError("You cannot delete your own account");
  }

  const existing = await getEditableUser(userId);
  const inactiveStatusId = await getLookupId("USER_STATUS", "INACTIVE");

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedByUserId: BigInt(actorUserId),
      statusId: inactiveStatusId,
      passwordHash: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      updatedByUserId: BigInt(actorUserId),
    },
  });

  await writeUserAuditLog({
    actorUserId: BigInt(actorUserId),
    action: "USER_DELETED",
    userId: existing.id,
    message: `User deleted: ${existing.email}`,
    metadata: {
      email: existing.email,
      name: existing.name,
      role: existing.role.code,
      opcoId: existing.opcoId?.toString() ?? null,
      partnerId: existing.partnerId?.toString() ?? null,
    },
  });
}
