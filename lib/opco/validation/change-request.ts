import { z } from "zod";

export const reportChangeRequestSchema = z.object({
  reportId: z.string().trim().min(1, "Report is required"),
  reason: z
    .string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(2000, "Reason must be 2000 characters or fewer"),
});

export type ReportChangeRequestInput = z.infer<typeof reportChangeRequestSchema>;
