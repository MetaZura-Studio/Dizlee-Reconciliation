import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetReminderSettings = vi.fn();
const mockedSendBroadcastNotification = vi.fn();
const mockedFindAdmin = vi.fn();
const mockedListReportMonitoringLanes = vi.fn();

vi.mock("@/lib/admin/reminder-settings", () => ({
  getReminderSettings: (...args: unknown[]) => mockedGetReminderSettings(...args),
}));

vi.mock("@/lib/dizlee/notifications/intimations", () => ({
  sendBroadcastNotification: (...args: unknown[]) =>
    mockedSendBroadcastNotification(...args),
}));

vi.mock("@/lib/dizlee/reports-monitoring", () => ({
  listReportMonitoringLanes: (...args: unknown[]) =>
    mockedListReportMonitoringLanes(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockedFindAdmin(...args),
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

function lane(params: {
  opcoId: string;
  partnerId: string;
  opcoStatus: "Missing" | "Submitted";
  partnerStatus: "Missing" | "Submitted";
}) {
  return {
    laneKey: `${params.opcoId}-${params.partnerId}`,
    opcoId: params.opcoId,
    partnerId: params.partnerId,
    opcoName: `OpCo ${params.opcoId}`,
    partnerName: `Partner ${params.partnerId}`,
    opcoReport: { status: params.opcoStatus, reportId: null, uploadedAt: null },
    partnerReport: {
      status: params.partnerStatus,
      reportId: null,
      uploadedAt: null,
    },
  };
}

function mockLanes(items: ReturnType<typeof lane>[]) {
  mockedListReportMonitoringLanes.mockResolvedValue({
    items,
    page: 1,
    pageSize: items.length || 10,
    totalPages: 1,
    totalCount: items.length,
    filters: {},
    summary: {
      totalLanes: items.length,
      opcoMissing: 0,
      partnerMissing: 0,
      bothMissing: 0,
      bothSubmitted: 0,
    },
  });
}

describe("runAutomaticSubmissionReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindAdmin.mockResolvedValue({ id: BigInt(1) });
    mockedSendBroadcastNotification.mockResolvedValue({
      id: "1",
      message: "ok",
      recipientCount: 2,
    });
    mockLanes([
      lane({
        opcoId: "1",
        partnerId: "2",
        opcoStatus: "Missing",
        partnerStatus: "Missing",
      }),
    ]);
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

  it("sends intimations only to orgs with Missing lanes", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
      schedule: baseSchedule,
    });
    mockLanes([
      lane({
        opcoId: "1",
        partnerId: "10",
        opcoStatus: "Missing",
        partnerStatus: "Submitted",
      }),
      lane({
        opcoId: "2",
        partnerId: "20",
        opcoStatus: "Submitted",
        partnerStatus: "Missing",
      }),
      lane({
        opcoId: "3",
        partnerId: "30",
        opcoStatus: "Submitted",
        partnerStatus: "Submitted",
      }),
    ]);

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
          deliveryChannel: "BOTH",
          requireEmailConfigured: false,
          opcoIds: ["1"],
          partnerIds: ["20"],
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
    mockLanes([
      lane({
        opcoId: "1",
        partnerId: "2",
        opcoStatus: "Missing",
        partnerStatus: "Missing",
      }),
      lane({
        opcoId: "9",
        partnerId: "2",
        opcoStatus: "Submitted",
        partnerStatus: "Missing",
      }),
    ]);

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
          deliveryChannel: "BOTH",
          requireEmailConfigured: false,
          opcoIds: ["1"],
          partnerIds: [],
        }),
      }),
    );
  });

  it("skips send when all orgs have already submitted", async () => {
    mockedGetReminderSettings.mockResolvedValue({
      remindersEnabled: true,
      reminderValue: 3,
      reminderUnit: "days",
      schedule: baseSchedule,
    });
    mockLanes([
      lane({
        opcoId: "1",
        partnerId: "2",
        opcoStatus: "Submitted",
        partnerStatus: "Submitted",
      }),
    ]);

    const result = await runAutomaticSubmissionReminders({
      now: new Date(2026, 6, 7, 12, 0, 0),
      fromUserId: BigInt(99),
    });

    expect(result).toMatchObject({
      status: "skipped",
      reason: "no_recipients",
    });
    expect(mockedSendBroadcastNotification).not.toHaveBeenCalled();
  });
});
