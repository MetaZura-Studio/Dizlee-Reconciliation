import { z } from "zod";

function optionalTrimmedString() {
  return z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();
}

export const updateEmailSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  senderAddress: optionalTrimmedString(),
  smtpHost: optionalTrimmedString(),
  smtpPort: z.union([z.number().int().positive(), z.null()]).optional(),
});

export const sendTestEmailSchema = z.object({
  recipient: z.string().trim().email("Enter a valid email address"),
});

export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>;
export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;
