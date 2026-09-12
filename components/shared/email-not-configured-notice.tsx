/**
 * Inline warning under Delivery method when Email/Both is selected but SMTP is not ready.
 */

"use client";

import { useEffect, useState } from "react";

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

let readinessInflight: Promise<ReadinessSnapshot | null> | null = null;

async function fetchEmailDeliveryReadiness(): Promise<ReadinessSnapshot | null> {
  if (readinessInflight) {
    return readinessInflight;
  }

  readinessInflight = (async () => {
    try {
      const response = await fetch("/api/dizlee/email-delivery-status", {
        cache: "no-store",
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as { data?: ReadinessSnapshot };
      if (!payload.data || typeof payload.data.ready !== "boolean") {
        return null;
      }
      return payload.data;
    } catch {
      return null;
    } finally {
      readinessInflight = null;
    }
  })();

  return readinessInflight;
}

function warningMessage(reason: ReadinessSnapshot["reason"]): string {
  if (reason === "email_disabled") {
    return "Email delivery is disabled. Contact an administrator to enable email in Admin → Email settings, or choose System notification.";
  }
  if (reason === "smtp_credentials_missing") {
    return "Email credentials are missing. Contact an administrator to enter SMTP user and password in Admin → Email settings, or choose System notification.";
  }
  return "Email is not configured (SMTP). Contact an administrator to set it up in Admin → Email settings, or choose System notification.";
}

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
      {warningMessage(readiness.reason)}
    </p>
  );
}
