/**
 * Unit tests for notification delivery channel helpers.
 */

import { describe, expect, it } from "vitest";

import {
  deliveryChannelLabel,
  deliveryCreatesInboxRecipients,
  deliverySendsEmail,
  formatDeliveryMessage,
  inboxDeliveryChannelFilter,
  isNotificationDeliveryChannel,
  notificationBodyToEmailHtml,
  parseDeliveryChannel,
} from "@/lib/platform/notification-delivery.shared";

describe("parseDeliveryChannel", () => {
  it("defaults to BOTH when missing", () => {
    expect(parseDeliveryChannel(undefined)).toBe("BOTH");
    expect(parseDeliveryChannel("")).toBe("BOTH");
  });

  it("accepts case-insensitive values", () => {
    expect(parseDeliveryChannel("system")).toBe("SYSTEM");
    expect(parseDeliveryChannel("Email")).toBe("EMAIL");
    expect(parseDeliveryChannel("BOTH")).toBe("BOTH");
  });

  it("rejects invalid values", () => {
    expect(() => parseDeliveryChannel("SMS")).toThrow(/Delivery method/);
  });
});

describe("delivery channel helpers", () => {
  it("classifies inbox vs email branches", () => {
    expect(deliveryCreatesInboxRecipients("SYSTEM")).toBe(true);
    expect(deliveryCreatesInboxRecipients("EMAIL")).toBe(false);
    expect(deliveryCreatesInboxRecipients("BOTH")).toBe(true);
    expect(deliverySendsEmail("SYSTEM")).toBe(false);
    expect(deliverySendsEmail("EMAIL")).toBe(true);
    expect(deliverySendsEmail("BOTH")).toBe(true);
  });

  it("filters inbox to SYSTEM and BOTH", () => {
    expect(inboxDeliveryChannelFilter()).toEqual({
      deliveryChannel: { in: ["SYSTEM", "BOTH"] },
    });
  });

  it("labels channels for UI", () => {
    expect(deliveryChannelLabel("SYSTEM")).toBe("System");
    expect(deliveryChannelLabel("EMAIL")).toBe("Email");
    expect(deliveryChannelLabel("BOTH")).toBe("System + Email");
    expect(isNotificationDeliveryChannel("SYSTEM")).toBe(true);
    expect(isNotificationDeliveryChannel("PUSH")).toBe(false);
  });

  it("escapes HTML for email body", () => {
    expect(notificationBodyToEmailHtml("Hello <b>x</b>\nY")).toContain(
      "Hello &lt;b&gt;x&lt;/b&gt;<br/>Y",
    );
  });

  it("formats delivery success messages", () => {
    expect(
      formatDeliveryMessage({
        channel: "SYSTEM",
        baseMessage: "Notification sent to 2 OpCos.",
      }),
    ).toBe("Notification sent to 2 OpCos.");

    expect(
      formatDeliveryMessage({
        channel: "EMAIL",
        baseMessage: "ignored",
        emailResult: { attempted: 3, sent: 3, failed: 0 },
      }),
    ).toBe("Emailed 3 users.");

    expect(
      formatDeliveryMessage({
        channel: "BOTH",
        baseMessage: "Notification sent to 1 OpCo.",
        emailResult: { attempted: 2, sent: 1, failed: 1 },
      }),
    ).toBe("Notification sent to 1 OpCo. Emailed 1 of 2 users (1 failed).");
  });
});

describe("DEFAULT_NOTIFICATION_DELIVERY_CHANNEL", () => {
  it("defaults event and manual sends to BOTH", async () => {
    const { DEFAULT_NOTIFICATION_DELIVERY_CHANNEL } = await import(
      "@/lib/platform/notification-delivery.shared"
    );
    expect(DEFAULT_NOTIFICATION_DELIVERY_CHANNEL).toBe("BOTH");
  });
});
