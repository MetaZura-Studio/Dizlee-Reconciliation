import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetReminderSettings = vi.fn();
const mockedSendMissingReportReminders = vi.fn();
const mockedSendMissingInvoiceReminders = vi.fn();
const mockedSendBroadcastNotification = vi.fn();
const mockedFindAdmin = vi.fn();
const mockedFindOpcos = vi.fn();
const mockedFindPartners = vi.fn();

vi.mock("@/lib/admin/reminder-settings", () => ({
  getReminderSettings: (...args: unknown[]) => mockedGetReminderSettings(...args),
}));

vi.mock("@/lib/platform/report-reminders", () => ({
  sendMissingReportReminders: (...args: unknown[]) =>
    mockedSendMissingReportReminders(...args),
}));

vi.mock("@/lib/platform/invoice-reminders", () => ({
  sendMissingInvoiceReminders: (...args: unknown[]) =>
    mockedSendMissingInvoiceReminders(...args),
}));

vi.mock("@/lib/dizlee/notifications/intimations", () => ({
  sendBroadcastNotification: (...args: unknown[]) =>
    mockedSendBroadcastNotification(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockedFindAdmin(...args),
    },
    opco: {
      findMany: (...args: unknown[]) => mockedFindOpcos(...args),
    },
    partner: {
      findMany: (...args: unknown[]) => mockedFindPartners(...args),
    },
  },
}));

import { runAutomaticSubmissionReminders } from "@/lib/admin/automatic-submission-reminders";

const baseSchedules = [
  {
    eventCode: "REPORT" as const,
    enabled: true,
    dueDayOfMonth: 10,
    intimations: [{ id: "i1", offsetDays: 3 }],
    reminders: [{ id: "r1", offsetDays: 1 }],
  },
  {
    eventCode: "INVOICE" as const,
    enabled: true,
    dueDayOfMonth: 15,
    intimations: [],
    reminders: [],
  },
];

describe("runAutomaticSubmissionReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindAdmin.mockResolvedValue({ id: BigInt(1) });
    mockedFindOpcos.mockResolvedValue([{ id: BigInt(1) }]);
    mockedFindPartners.mockResolvedValue([{ id: BigInt(2) }]);
    mockedSendBroadcastNotification.mockResolvedValue({
      id: "1",
      message: "ok",
      recipientCount: 2,
    });
  });

  it("skips when reminders are disabled", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: false,
      reminderValue: 3,
      reminderUnit: "days",
      schedules: baseSchedules,
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date(2026, 6, 7, 12, 0, 0),
      fromUserId: BigInt(99),
    });

    expect(result.status).toBe("skipped");
    if (result.status === "skipped") {
      expect(result.reason).toBe("disabled");
    }
    expect(mockedSendBroadcastNotification).not.toHaveBeenCalled();
  });

  it("skips when no steps are due today", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
      schedules: baseSchedules,
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date(2026, 6, 5, 12, 0, 0),
      fromUserId: BigInt(99),
    });

    expect(result).toMatchObject({
      status: "skipped",
      reason: "no_steps_due",
    });
  });

  it("sends intimations when an intimation step is due", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
      schedules: baseSchedules,
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date(2026, 6, 7, 12, 0, 0),
      fromUserId: BigInt(99),
    });

    expect(result.status).toBe("sent");
    expect(mockedSendBroadcastNotification).toHaveBeenCalled();
    expect(mockedSendMissingReportReminders).not.toHaveBeenCalled();
  });

  it("sends missing-report reminders when a reminder step is due", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
      schedules: baseSchedules,
    });
    mockedSendMissingReportReminders.mockResolvedValue({
      opcoNotifications: 2,
      partnerNotifications: 1,
      message: "Sent",
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date(2026, 6, 11, 12, 0, 0),
      fromUserId: BigInt(99),
    });

    expect(result.status).toBe("sent");
    expect(mockedSendMissingReportReminders).toHaveBeenCalledWith(
      expect.objectContaining({
        templateCode: "REPORT_REMINDER",
        month: 7,
        year: 2026,
      }),
    );
  });
});
