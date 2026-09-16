/**
 * Delivery method radios with Email/Both disabled when SMTP is not ready.
 */

"use client";

import { useEffect, useState } from "react";

import { FieldLegend } from "@/components/ui/field";
import {
  deliverySendsEmail,
  type NotificationDeliveryChannel,
} from "@/lib/platform/notification-delivery.shared";
import { cn } from "@/lib/ui/classes";

export const EMAIL_SETTINGS_REQUIRED_MESSAGE =
  "Kindly configure email settings before sending emails.";

type ReadinessSnapshot = {
  ready: boolean;
  reason:
    | "email_disabled"
    | "smtp_not_configured"
    | "smtp_credentials_missing"
    | null;
};

let readinessInflight: Promise<ReadinessSnapshot | null> | null = null;

export async function fetchEmailDeliveryReadiness(): Promise<ReadinessSnapshot | null> {
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

/** Shared SMTP readiness for Dizlee compose UIs. */
export function useEmailDeliveryReadiness(): {
  ready: boolean | null;
  emailChannelsDisabled: boolean;
} {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchEmailDeliveryReadiness().then((result) => {
      if (!cancelled && result) {
        setReady(result.ready);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ready,
    emailChannelsDisabled: ready === false,
  };
}

const DEFAULT_DELIVERY_OPTIONS: Array<{
  value: NotificationDeliveryChannel;
  label: string;
  hint: string;
}> = [
  {
    value: "SYSTEM",
    label: "System notification",
    hint: "In-app inbox and bell only",
  },
  {
    value: "EMAIL",
    label: "Email notification",
    hint: "Email only (still logged in Outbox)",
  },
  {
    value: "BOTH",
    label: "Both",
    hint: "In-app inbox plus email",
  },
];

type DeliveryChannelPickerProps = {
  name: string;
  value: NotificationDeliveryChannel;
  onChange: (channel: NotificationDeliveryChannel) => void;
  disabled?: boolean;
  description?: string;
  options?: Array<{
    value: NotificationDeliveryChannel;
    label: string;
    hint: string;
  }>;
};

export function DeliveryChannelPicker({
  name,
  value,
  onChange,
  disabled = false,
  description,
  options = DEFAULT_DELIVERY_OPTIONS,
}: DeliveryChannelPickerProps) {
  const { emailChannelsDisabled } = useEmailDeliveryReadiness();

  useEffect(() => {
    if (emailChannelsDisabled && deliverySendsEmail(value)) {
      onChange("SYSTEM");
    }
  }, [emailChannelsDisabled, onChange, value]);

  return (
    <fieldset className="space-y-2">
      <FieldLegend required>Delivery method</FieldLegend>
      {description ? (
        <p className="text-xs text-foreground-subtle">{description}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const selected = value === option.value;
          const optionNeedsEmail = deliverySendsEmail(option.value);
          const optionDisabled =
            disabled || (emailChannelsDisabled && optionNeedsEmail);

          return (
            <label
              key={option.value}
              title={
                emailChannelsDisabled && optionNeedsEmail
                  ? EMAIL_SETTINGS_REQUIRED_MESSAGE
                  : undefined
              }
              className={cn(
                "flex h-full items-start gap-3 rounded-xl border bg-surface p-3 text-sm shadow-[var(--shadow-sm)] transition-colors",
                optionDisabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer",
                selected
                  ? "border-primary ring-2 ring-[var(--ring)]"
                  : "border-border",
                !optionDisabled && !selected && "hover:border-border-strong",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => {
                  if (!optionDisabled) {
                    onChange(option.value);
                  }
                }}
                className="mt-1 shrink-0"
                disabled={optionDisabled}
              />
              <span>
                <span className="font-medium text-foreground">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-foreground-subtle">
                  {option.hint}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
