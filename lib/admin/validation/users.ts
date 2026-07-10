import { z } from "zod";

export const ADMIN_ASSIGNABLE_ROLES = ["client", "opco", "partner"] as const;
export const ADMIN_USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export const adminUserRoleSchema = z.enum(ADMIN_ASSIGNABLE_ROLES);
export const adminUserStatusSchema = z.enum(ADMIN_USER_STATUSES);

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  role: adminUserRoleSchema,
  status: adminUserStatusSchema.default("ACTIVE"),
});

export const updateUserSchema = createUserSchema;

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
