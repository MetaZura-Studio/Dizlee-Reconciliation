import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetReminderSettings = vi.fn();
const mockedSendMissingReportReminders = vi.fn();
const mockedFindAdmin = vi.fn();

vi.mock("@/lib/admin/reminder-settings", () => ({
  getReminderSettings: (...args: unknown[]) => mockedGetReminderSettings(...args),
}));

vi.mock("@/lib/platform/report-reminders", () => ({
  sendMissingReportReminders: (...args: unknown[]) =>
    mockedSendMissingReportReminders(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockedFindAdmin(...args),
    },
  },
}));

import { runAutomaticSubmissionReminders } from "@/lib/admin/automatic-submission-reminders";

describe("runAutomaticSubmissionReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindAdmin.mockResolvedValue({ id: BigInt(1) });
  });

  it("skips when reminders are disabled", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: false,
      reminderValue: 3,
      reminderUnit: "days",
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date("2026-07-05T12:00:00Z"),
      fromUserId: BigInt(99),
    });

    expect(result.status).toBe("skipped");
    if (result.status === "skipped") {
      expect(result.reason).toBe("disabled");
    }
    expect(mockedSendMissingReportReminders).not.toHaveBeenCalled();
  });

  it("skips when schedule is invalid", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: null,
      reminderUnit: "days",
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date("2026-07-05T12:00:00Z"),
      fromUserId: BigInt(99),
    });

    expect(result).toMatchObject({
      status: "skipped",
      reason: "invalid_schedule",
    });
  });

  it("skips when period is not yet eligible", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date("2026-07-02T12:00:00Z"),
      fromUserId: BigInt(99),
    });

    expect(result).toMatchObject({
      status: "skipped",
      reason: "not_eligible",
      period: { month: 7, year: 2026 },
    });
  });

  it("sends reminders when eligible and missing reports exist", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
    });
    mockedSendMissingReportReminders.mockResolvedValue({
      opcoNotifications: 2,
      partnerNotifications: 1,
      message: "Sent 2 OpCo reminders and 1 Partner reminder.",
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date("2026-07-05T12:00:00Z"),
      fromUserId: BigInt(99),
    });

    expect(result).toMatchObject({
      status: "sent",
      opcoNotifications: 2,
      partnerNotifications: 1,
    });
    expect(mockedSendMissingReportReminders).toHaveBeenCalledWith({
      month: 7,
      year: 2026,
      target: "both",
      fromUserId: BigInt(99),
      throwIfNoRecipients: false,
    });
  });

  it("skips when no missing reports", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
    });
    mockedSendMissingReportReminders.mockResolvedValue({
      opcoNotifications: 0,
      partnerNotifications: 0,
      message: "No lanes with missing reports found for this period.",
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date("2026-07-05T12:00:00Z"),
      fromUserId: BigInt(99),
    });

    expect(result).toMatchObject({
      status: "skipped",
      reason: "no_missing_reports",
    });
  });
});
