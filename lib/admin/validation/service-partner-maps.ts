/**
 * Zod schemas for Admin Service–Partner map create/update.
 */
import { z } from "zod";

export const createServicePartnerMapSchema = z.object({
  opcoId: z.string().trim().min(1, "OpCo is required"),
  serviceName: z.string().trim().min(1, "Service/Application name is required").max(255),
  partnerId: z.string().trim().min(1, "Partner is required"),
});

export const updateServicePartnerMapSchema = z.object({
  opcoId: z.string().trim().min(1, "OpCo is required"),
  serviceName: z.string().trim().min(1, "Service/Application name is required").max(255),
  partnerId: z.string().trim().min(1, "Partner is required"),
});

export type CreateServicePartnerMapInput = z.infer<
  typeof createServicePartnerMapSchema
>;
export type UpdateServicePartnerMapInput = z.infer<
  typeof updateServicePartnerMapSchema
>;
