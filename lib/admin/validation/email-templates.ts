import { z } from "zod";

export const saveEmailTemplateSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(255, "Subject is too long"),
  body: z.string().trim().min(1, "Body is required"),
  changeNote: z
    .string()
    .trim()
    .max(500, "Change note must be at most 500 characters")
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
});

export const revertEmailTemplateSchema = z.object({
  version: z.number().int().positive("Version must be a positive number"),
});

export type SaveEmailTemplateInput = z.infer<typeof saveEmailTemplateSchema>;
export type RevertEmailTemplateInput = z.infer<typeof revertEmailTemplateSchema>;
