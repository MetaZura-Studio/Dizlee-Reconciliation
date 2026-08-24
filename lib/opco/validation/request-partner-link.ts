/**
 * Zod schema for OpCo “please add these Partner links” requests.
 */

import { z } from "zod";

const partnerNameList = z
  .array(z.string().trim().min(1).max(255))
  .max(100)
  .default([]);

export const requestPartnerLinkSchema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    message: z
      .string()
      .trim()
      .min(10, "Message must be at least 10 characters")
      .max(2000, "Message must be 2000 characters or fewer"),
    unlinkedPartnerNames: partnerNameList,
    unknownPartnerNames: partnerNameList,
  })
  .refine(
    (data) =>
      data.unlinkedPartnerNames.length + data.unknownPartnerNames.length > 0,
    { message: "At least one partner name is required", path: ["unlinkedPartnerNames"] },
  );

export type RequestPartnerLinkInput = z.infer<typeof requestPartnerLinkSchema>;
