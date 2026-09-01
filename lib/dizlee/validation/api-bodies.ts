/**
 * Boundary Zod schemas for Dizlee JSON POST/PATCH bodies (S16).
 * Intentionally permissive: coerce string numbers, treat null/"" as absent,
 * do not use .strict() so extra client fields are ignored (not rejected).
 */

import { z } from "zod";

const monthSchema = z.coerce.number().int().min(1).max(12);
const yearSchema = z.coerce.number().int().min(2000).max(2100);

/** Empty / null → undefined; otherwise string id. */
const optionalId = z.preprocess((value) => {
  if (value === "" || value == null) return undefined;
  return value;
}, z.coerce.string().min(1).optional());

const idList = z.preprocess((value) => {
  if (value == null) return [];
  return value;
}, z.array(z.coerce.string()));

const optionalString = z.preprocess((value) => {
  if (value == null) return undefined;
  return value;
}, z.union([z.string(), z.number()]).transform(String).optional());

const optionalNullableString = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return String(value);
}, z.union([z.string(), z.null()]).optional());

export const sendBroadcastBodySchema = z.object({
  audience: z.enum(["opco", "partner", "both"]).optional(),
  subject: optionalString,
  message: optionalString,
  body: optionalString,
  opcoIds: idList,
  partnerIds: idList,
  messageSource: optionalString,
  month: monthSchema.optional(),
  year: yearSchema.optional(),
  priority: optionalNullableString,
  expiresAt: optionalNullableString,
  attachmentFileIds: idList,
  deliveryChannel: z
    .enum(["SYSTEM", "EMAIL", "BOTH", "system", "email", "both"])
    .optional(),
});

export const sendRemindersBodySchema = z.object({
  month: monthSchema,
  year: yearSchema,
  laneKeys: idList,
  target: z.enum(["opco", "partner", "both"]).optional(),
  messageSource: optionalString,
  subject: optionalString,
  body: optionalString,
  attachmentFileIds: idList,
  deliveryChannel: z
    .enum(["SYSTEM", "EMAIL", "BOTH", "system", "email", "both"])
    .optional(),
});

export const createOpcoInvoiceBodySchema = z.object({
  month: monthSchema,
  year: yearSchema,
  opcoId: z.coerce.string().min(1),
  currencyId: optionalId,
  bankAccountId: optionalId,
  preparedBy: optionalString,
  approvedBy: optionalString,
  lineItems: z
    .array(
      z.object({
        description: z.coerce.string(),
        quantity: z.coerce.number(),
        unitPrice: z.coerce.number(),
      }),
    )
    .min(1),
  deliveryChannel: z
    .enum(["SYSTEM", "EMAIL", "BOTH", "system", "email", "both"])
    .optional(),
});

export const runReconciliationBodySchema = z.object({
  month: monthSchema,
  year: yearSchema,
  opcoId: z.coerce.string().min(1),
  partnerId: z.coerce.string().min(1),
});

export const generateConsolidationBodySchema = z.object({
  month: monthSchema,
  year: yearSchema,
  opcoId: z.coerce.string().min(1),
});

export const rejectReuploadBodySchema = z.object({
  decisionNote: optionalString,
});
