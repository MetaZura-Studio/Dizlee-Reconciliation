/**
 * Zod schemas for Admin notification template create, save, and revert actions.
 */
import { z } from "zod";

export const saveEmailTemplateSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(255, "Subject is too long"),
  body: z.string().trim().min(1, "Body is required"),
  changeNote: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value == null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine(
      (value) => value === null || value.length <= 500,
      "Change note must be at most 500 characters",
    ),
});

export const revertEmailTemplateSchema = z.object({
  version: z.number().int().positive("Version must be a positive number"),
});

export const createEmailTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(
      z
        .string()
        .min(2, "Code is required")
        .max(64, "Code is too long")
        .regex(
          /^[A-Z][A-Z0-9_]*$/,
          "Code must be uppercase letters, numbers, and underscores",
        ),
    ),
  category: z.enum(["INTIMATION", "REMINDER", "ALERT", "OTHER"], {
    message: "Category is required",
  }),
  subject: z.string().trim().min(1, "Subject is required").max(255, "Subject is too long"),
  body: z.string().trim().min(1, "Body is required"),
  changeNote: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value == null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine(
      (value) => value === null || value.length <= 500,
      "Change note must be at most 500 characters",
    ),
});

export type SaveEmailTemplateInput = z.infer<typeof saveEmailTemplateSchema>;
export type RevertEmailTemplateInput = z.infer<typeof revertEmailTemplateSchema>;
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
