/**
 * Zod schemas for Admin OpCo–Partner link load and save requests.
 */
import { z } from "zod";

const idString = z.string().trim().min(1, "Invalid ID");

export const getOpcoPartnerLinksSchema = z.object({
  opcoId: idString,
});

export const saveOpcoPartnerLinksSchema = z.object({
  opcoId: idString,
  partnerIds: z.array(idString),
});

export type SaveOpcoPartnerLinksInput = z.infer<
  typeof saveOpcoPartnerLinksSchema
>;
