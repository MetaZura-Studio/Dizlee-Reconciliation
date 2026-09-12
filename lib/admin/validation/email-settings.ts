/**
 * Zod schemas for Admin SMTP settings and send-test-email actions.
 */
import { z } from "zod";

export const sendTestEmailSchema = z.object({
  recipient: z.string().trim().email("Enter a valid email address"),
});

export const updateEmailSettingsSchema = z
  .object({
    emailEnabled: z.boolean(),
    smtpHost: z
      .string()
      .trim()
      .max(255, "SMTP host must be at most 255 characters")
      .optional()
      .nullable()
      .transform((value) => {
        if (value === undefined || value === null || value === "") {
          return null;
        }
        return value;
      }),
    smtpPort: z
      .number()
      .int("SMTP port must be a whole number")
      .min(1, "SMTP port must be at least 1")
      .max(65535, "SMTP port must be at most 65535")
      .optional()
      .nullable(),
    senderAddress: z
      .string()
      .trim()
      .max(255, "Sender address must be at most 255 characters")
      .optional()
      .nullable()
      .transform((value) => {
        if (value === undefined || value === null || value === "") {
          return null;
        }
        return value;
      })
      .refine(
        (value) => value === null || z.string().email().safeParse(value).success,
        "Enter a valid sender email address",
      ),
    /** When provided (non-empty), replaces stored SMTP user. Omit/blank keeps existing. */
    smtpUser: z
      .string()
      .max(255, "SMTP user must be at most 255 characters")
      .optional()
      .nullable(),
    /** When provided (non-empty), replaces stored SMTP password. Omit/blank keeps existing. */
    smtpPassword: z.string().max(512, "SMTP password is too long").optional().nullable(),
    /** When true, blank smtpUser/smtpPassword clear stored credentials. */
    clearSmtpCredentials: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.emailEnabled && !value.smtpHost) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["smtpHost"],
        message: "SMTP host is required when email is enabled",
      });
    }

    if (value.emailEnabled && (value.smtpPort === null || value.smtpPort === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["smtpPort"],
        message: "SMTP port is required when email is enabled",
      });
    }

    if (value.emailEnabled && !value.senderAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["senderAddress"],
        message: "Sender address is required when email is enabled",
      });
    }

    const user = value.smtpUser?.trim() ?? "";
    const password = value.smtpPassword ?? "";
    const hasUser = user.length > 0;
    const hasPassword = password.length > 0;
    if (hasUser !== hasPassword && !value.clearSmtpCredentials) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasUser ? ["smtpPassword"] : ["smtpUser"],
        message: "Enter both SMTP user and password together",
      });
    }
  });

export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;
export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>;
