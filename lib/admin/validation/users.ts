import { z } from "zod";

import { passwordSchema } from "@/lib/auth/password-policy";

export const ADMIN_ASSIGNABLE_ROLES = ["client", "opco", "partner"] as const;
export const ADMIN_USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export const adminUserRoleSchema = z.enum(ADMIN_ASSIGNABLE_ROLES);
export const adminUserStatusSchema = z.enum(ADMIN_USER_STATUSES);

const userAssignmentRefinement = (
  data: {
    role: z.infer<typeof adminUserRoleSchema>;
    opcoId?: string | null;
    partnerId?: string | null;
  },
  context: z.RefinementCtx,
) => {
  if (data.role === "opco" && !data.opcoId) {
    context.addIssue({
      code: "custom",
      message: "OpCo is required for OpCo users",
      path: ["opcoId"],
    });
  }
  if (data.role === "partner" && !data.partnerId) {
    context.addIssue({
      code: "custom",
      message: "Partner is required for Partner users",
      path: ["partnerId"],
    });
  }
  if (data.role === "client" && (data.opcoId || data.partnerId)) {
    context.addIssue({
      code: "custom",
      message: "Dizlee users cannot be linked to an OpCo or Partner",
      path: ["role"],
    });
  }
  if (data.role === "opco" && data.partnerId) {
    context.addIssue({
      code: "custom",
      message: "OpCo users cannot be linked to a Partner",
      path: ["partnerId"],
    });
  }
  if (data.role === "partner" && data.opcoId) {
    context.addIssue({
      code: "custom",
      message: "Partner users cannot be linked to an OpCo",
      path: ["opcoId"],
    });
  }
};

const userProfileFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  role: adminUserRoleSchema,
  status: adminUserStatusSchema.default("ACTIVE"),
  opcoId: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable(),
});

export const createUserSchema = userProfileFieldsSchema
  .extend({
    password: passwordSchema,
  })
  .superRefine(userAssignmentRefinement);

export const updateUserSchema = userProfileFieldsSchema.superRefine(
  userAssignmentRefinement,
);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
