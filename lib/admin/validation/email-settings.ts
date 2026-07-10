import { z } from "zod";

export const sendTestEmailSchema = z.object({
  recipient: z.string().trim().email("Enter a valid email address"),
});

export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;
