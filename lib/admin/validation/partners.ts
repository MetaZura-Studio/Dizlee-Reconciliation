import { z } from "zod";

export const adminEntityStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const createPartnerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  status: adminEntityStatusSchema.default("ACTIVE"),
});

export const updatePartnerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  status: adminEntityStatusSchema,
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
