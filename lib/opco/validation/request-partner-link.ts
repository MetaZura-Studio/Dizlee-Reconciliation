/**
 * Zod schema for OpCo “please add these Partner links” requests.
 */

import { z } from "zod";

/** Large OpCos (e.g. Kuwait service-map files) can list hundreds of names. */
const MAX_PARTNER_NAMES_PER_LIST = 2000;

const partnerNameList = z
  .array(z.string().trim().min(1).max(255))
  .max(
    MAX_PARTNER_NAMES_PER_LIST,
    `At most ${MAX_PARTNER_NAMES_PER_LIST} partner names can be requested at once`,
  )
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
