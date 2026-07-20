import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetReminderSettings = vi.fn();
const mockedSendBroadcastNotification = vi.fn();
const mockedFindAdmin = vi.fn();
const mockedFindOpcos = vi.fn();
const mockedFindPartners = vi.fn();

vi.mock("@/lib/admin/reminder-settings", () => ({
  getReminderSettings: (...args: unknown[]) => mockedGetReminderSettings(...args),
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

const baseSchedule = {
  enabled: true,
  dueDayOfMonth: 10,
  intimations: [
    {
      id: "i1",
      dayOfMonth: 7,
      templateCode: "REPORT_SUBMISSION",
      audience: "both" as const,
    },
  ],
  reminders: [
    {
      id: "r1",
      dayOfMonth: 11,
      templateCode: "REPORT_REMINDER",
      audience: "opco" as const,
    },
  ],
};

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
      schedule: baseSchedule,
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
      schedule: baseSchedule,
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

  it("sends intimations when an intimation day is due", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
      schedule: baseSchedule,
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date(2026, 6, 7, 12, 0, 0),
      fromUserId: BigInt(99),
    });

    expect(result.status).toBe("sent");
    expect(mockedSendBroadcastNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          audience: "both",
          messageSource: "REPORT_SUBMISSION",
        }),
      }),
    );
  });

  it("sends reminders to the step audience when due", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
      schedule: baseSchedule,
    });

    const result = await runAutomaticSubmissionReminders({
      now: new Date(2026, 6, 11, 12, 0, 0),
      fromUserId: BigInt(99),
    });

    expect(result.status).toBe("sent");
    expect(mockedSendBroadcastNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          audience: "opco",
          messageSource: "REPORT_REMINDER",
        }),
      }),
    );
    expect(mockedFindPartners).not.toHaveBeenCalled();
  });
});
