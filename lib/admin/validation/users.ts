/**
 * Zod schemas for Admin user create/update — role, org assignment, and status rules.
 */
import { z } from "zod";

export const ADMIN_ASSIGNABLE_ROLES = ["client", "opco", "partner"] as const;
export const ADMIN_USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export const adminUserRoleSchema = z.enum(ADMIN_ASSIGNABLE_ROLES);
export const adminUserStatusSchema = z.enum(ADMIN_USER_STATUSES);

const optionalIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Invalid id")
  .optional()
  .nullable();

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email("Enter a valid email address"),
    role: adminUserRoleSchema,
    status: adminUserStatusSchema.default("ACTIVE"),
    opcoId: optionalIdSchema,
    partnerId: optionalIdSchema,
  })
  .superRefine((value, ctx) => {
    if (value.role === "opco" && !value.opcoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["opcoId"],
        message: "Select an OpCo",
      });
    }

    if (value.role === "partner" && !value.partnerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partnerId"],
        message: "Select a Partner",
      });
    }

    if (value.role === "client") {
      if (value.opcoId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["opcoId"],
          message: "Dizlee users cannot be linked to an OpCo",
        });
      }
      if (value.partnerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["partnerId"],
          message: "Dizlee users cannot be linked to a Partner",
        });
      }
    }

    if (value.role === "opco" && value.partnerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partnerId"],
        message: "OpCo users cannot be linked to a Partner",
      });
    }

    if (value.role === "partner" && value.opcoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["opcoId"],
        message: "Partner users cannot be linked to an OpCo",
      });
    }
  });

export const updateUserSchema = createUserSchema;

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
