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
  });

export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;
export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>;
