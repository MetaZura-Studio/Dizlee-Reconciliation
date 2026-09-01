/**
 * Unit tests for Dizlee API body schemas (S16) — must accept real UI payloads.
 */

import { describe, expect, it } from "vitest";

import {
  createOpcoInvoiceBodySchema,
  generateConsolidationBodySchema,
  runReconciliationBodySchema,
  sendBroadcastBodySchema,
  sendRemindersBodySchema,
} from "@/lib/dizlee/validation/api-bodies";

describe("sendBroadcastBodySchema", () => {
  it("accepts intimations-view custom payload", () => {
    const parsed = sendBroadcastBodySchema.safeParse({
      audience: "both",
      messageSource: "custom",
      month: undefined,
      year: undefined,
      subject: "Hello",
      body: "World",
      opcoIds: ["1", "2"],
      partnerIds: [],
      priority: null,
      expiresAt: null,
      deliveryChannel: "BOTH",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts string month/year and numeric ids", () => {
    const parsed = sendBroadcastBodySchema.safeParse({
      audience: "opco",
      messageSource: "REPORT_SUBMISSION",
      month: "4",
      year: "2026",
      opcoIds: [1, 2],
      partnerIds: null,
      subject: "Sub",
      body: "Body",
      extraClientField: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.month).toBe(4);
      expect(parsed.data.year).toBe(2026);
      expect(parsed.data.opcoIds).toEqual(["1", "2"]);
      expect(parsed.data.partnerIds).toEqual([]);
    }
  });

  it("rejects invalid deliveryChannel", () => {
    const parsed = sendBroadcastBodySchema.safeParse({
      audience: "opco",
      subject: "Hello",
      body: "World",
      opcoIds: ["1"],
      partnerIds: [],
      deliveryChannel: "SMS",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("sendRemindersBodySchema", () => {
  it("accepts reminders-view payload", () => {
    const parsed = sendRemindersBodySchema.safeParse({
      month: 8,
      year: 2026,
      laneKeys: ["1-2"],
      target: "both",
      messageSource: "REPORT_REMINDER",
      subject: "Reminder",
      body: "Please upload",
      attachmentFileIds: ["10"],
      deliveryChannel: "EMAIL",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("createOpcoInvoiceBodySchema", () => {
  it("accepts create-invoice modal payload", () => {
    const parsed = createOpcoInvoiceBodySchema.safeParse({
      month: 8,
      year: 2026,
      opcoId: "5",
      currencyId: undefined,
      bankAccountId: "",
      preparedBy: "Alex",
      approvedBy: "Sam",
      lineItems: [{ description: "Service", quantity: 1, unitPrice: 100 }],
      deliveryChannel: "BOTH",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.bankAccountId).toBeUndefined();
      expect(parsed.data.lineItems[0]?.quantity).toBe(1);
      expect(parsed.data.deliveryChannel).toBe("BOTH");
    }
  });

  it("coerces string quantities from JSON", () => {
    const parsed = createOpcoInvoiceBodySchema.safeParse({
      month: "8",
      year: "2026",
      opcoId: 5,
      lineItems: [{ description: "A", quantity: "2", unitPrice: "50.5" }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.opcoId).toBe("5");
      expect(parsed.data.lineItems[0]?.unitPrice).toBe(50.5);
    }
  });

  it("rejects invalid deliveryChannel", () => {
    const parsed = createOpcoInvoiceBodySchema.safeParse({
      month: 8,
      year: 2026,
      opcoId: "5",
      lineItems: [{ description: "A", quantity: 1, unitPrice: 10 }],
      deliveryChannel: "SMS",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("run / consolidation schemas", () => {
  it("accepts normal period + ids", () => {
    expect(
      runReconciliationBodySchema.safeParse({
        month: 8,
        year: 2026,
        opcoId: "1",
        partnerId: "2",
      }).success,
    ).toBe(true);
    expect(
      generateConsolidationBodySchema.safeParse({
        month: 8,
        year: 2026,
        opcoId: "1",
      }).success,
    ).toBe(true);
  });
});
