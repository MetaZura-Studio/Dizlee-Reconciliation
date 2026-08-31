/**
 * Zod schema for OpCo monthly submission change-request payloads.
 */

import { z } from "zod";

export const submissionChangeRequestSchema = z.object({
  submissionId: z.string().trim().min(1, "Monthly report is required"),
  reason: z
    .string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(2000, "Reason must be 2000 characters or fewer"),
});

export type SubmissionChangeRequestInput = z.infer<
  typeof submissionChangeRequestSchema
>;
