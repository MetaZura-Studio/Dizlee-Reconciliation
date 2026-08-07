/**
 * Zod schemas for Admin OpCo invoice bank account JSON updates.
 */
import { z } from "zod";

const optionalBankField = z
  .string()
  .max(255, "Value is too long")
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const invoiceBankAccountSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    label: z
      .string()
      .trim()
      .min(1, "Label is required")
      .max(255, "Label is too long"),
    bankName: optionalBankField,
    accountName: optionalBankField,
    accountNumber: optionalBankField,
    iban: optionalBankField,
    swift: optionalBankField,
    reference: optionalBankField,
  })
  .superRefine((value, ctx) => {
    if (
      !value.bankName &&
      !value.accountName &&
      !value.accountNumber &&
      !value.iban &&
      !value.swift &&
      !value.reference
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter at least one bank detail field",
      });
    }
  });

export const updateInvoiceBankDetailsSchema = z.object({
  accounts: z.array(invoiceBankAccountSchema),
});

export type UpdateInvoiceBankDetailsInput = z.infer<
  typeof updateInvoiceBankDetailsSchema
>;
export type InvoiceBankAccountInput = z.infer<typeof invoiceBankAccountSchema>;
