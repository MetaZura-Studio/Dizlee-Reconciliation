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

export const updateInvoiceBankDetailsSchema = z.object({
  bankName: optionalBankField,
  accountName: optionalBankField,
  accountNumber: optionalBankField,
  iban: optionalBankField,
  swift: optionalBankField,
  reference: optionalBankField,
});

export type UpdateInvoiceBankDetailsInput = z.infer<
  typeof updateInvoiceBankDetailsSchema
>;
