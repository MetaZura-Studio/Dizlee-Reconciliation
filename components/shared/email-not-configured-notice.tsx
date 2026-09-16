/**
 * Inline warning under Delivery method when Email/Both is selected but SMTP is not ready.
 * Prefer DeliveryChannelPicker (disables Email/Both with hover message) for new UIs.
 */

"use client";

import { useEffect, useState } from "react";

import {
  EMAIL_SETTINGS_REQUIRED_MESSAGE,
  fetchEmailDeliveryReadiness,
} from "@/components/shared/delivery-channel-picker";
import {
  deliverySendsEmail,
  type NotificationDeliveryChannel,
} from "@/lib/platform/notification-delivery.shared";
import { ui } from "@/lib/ui/classes";

type ReadinessSnapshot = {
  ready: boolean;
  reason:
    | "email_disabled"
    | "smtp_not_configured"
    | "smtp_credentials_missing"
    | null;
};

export function EmailNotConfiguredNotice({
  channel,
}: {
  channel: NotificationDeliveryChannel;
}) {
  const [readiness, setReadiness] = useState<ReadinessSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchEmailDeliveryReadiness().then((result) => {
      if (!cancelled && result) {
        setReadiness(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!deliverySendsEmail(channel) || readiness == null || readiness.ready) {
    return null;
  }

  const tone = channel === "EMAIL" ? ui.alertError : ui.alertWarning;

  return (
    <p className={tone} role="status">
      {EMAIL_SETTINGS_REQUIRED_MESSAGE}
    </p>
  );
}
