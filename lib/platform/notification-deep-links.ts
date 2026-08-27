/**
 * Resolve in-app destinations for notification list items from metadata/subject/body.
 * Prefer structured metadata until notifications gain a dedicated actionUrl column.
 */

import {
  OPCO_REPORTS_UPLOADED_SUBJECT,
  OPCO_REPORT_RESUBMITTED_SUBJECT,
  parseNotificationMetadata,
  resolveNotificationAction,
} from "@/lib/platform/notification-metadata";
import { PARTNER_LINK_REQUEST_SUBJECT_PREFIX } from "@/lib/platform/partner-link-request";

export type NotificationPortal = "opco" | "partner" | "dizlee" | "admin";

export type NotificationDeepLinkItem = {
  id: string;
  subject: string;
  bodyPreview?: string | null;
  body?: string | null;
  metadataJson?: string | null;
};

function opcoIdFromText(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }
  const match = /\[opcoId=(\d+)\]/.exec(text);
  return match?.[1] ?? null;
}

/**
 * Returns a portal-relative path for a notification, or the inbox fallback.
 */
export function resolveNotificationHref(
  portal: NotificationPortal,
  item: NotificationDeepLinkItem,
  inboxHref: string,
): string {
  const subject = item.subject.trim();
  const bodyText = `${item.body ?? ""}\n${item.bodyPreview ?? ""}`;
  const metadata = parseNotificationMetadata(item.metadataJson);

  if (portal === "dizlee") {
    const action = resolveNotificationAction(metadata, subject);
    if (action) {
      return action.href;
    }
  }

  if (subject.startsWith(PARTNER_LINK_REQUEST_SUBJECT_PREFIX)) {
    const opcoId =
      metadata?.type === "PARTNER_LINK_REQUEST"
        ? metadata.opcoId
        : opcoIdFromText(bodyText);
    if (portal === "admin") {
      const params = new URLSearchParams({ tab: "requests" });
      if (opcoId) {
        params.set("opcoId", opcoId);
      }
      return `/admin/opco-partners?${params.toString()}`;
    }
  }

  if (
    (subject === "Partner link created" ||
      subject === "Partner link request denied" ||
      metadata?.type === "PARTNER_LINK_APPROVED" ||
      metadata?.type === "PARTNER_LINK_REJECTED") &&
    portal === "opco"
  ) {
    return "/opco/upload";
  }

  if (
    subject === "OpCo report reupload requested" ||
    subject === "OpCo monthly report reupload requested" ||
    subject === "Partner report reupload requested"
  ) {
    if (portal === "dizlee") {
      return "/dizlee/reports/reupload";
    }
  }

  if (
    subject === "Reupload request approved" ||
    subject === "Reupload request rejected"
  ) {
    if (portal === "opco") {
      return "/opco/reports";
    }
    if (portal === "partner") {
      return "/partner/reports";
    }
  }

  if (/invoice/i.test(subject)) {
    if (portal === "opco") {
      return "/opco/invoices";
    }
    if (portal === "partner") {
      return "/partner/invoices";
    }
    if (portal === "dizlee") {
      return "/dizlee/invoices";
    }
  }

  if (/reconcil/i.test(subject) && portal === "dizlee") {
    return "/dizlee/reconciliation";
  }

  if (
    (subject === OPCO_REPORTS_UPLOADED_SUBJECT ||
      subject === "OpCo report uploaded" ||
      subject === "Partner report uploaded") &&
    portal === "dizlee"
  ) {
    return "/dizlee/reports";
  }

  if (subject === OPCO_REPORT_RESUBMITTED_SUBJECT && portal === "dizlee") {
    return "/dizlee/reconciliation";
  }

  if (portal === "dizlee") {
    return `/dizlee/notifications?tab=inbox&id=${encodeURIComponent(item.id)}`;
  }

  const sep = inboxHref.includes("?") ? "&" : "?";
  return `${inboxHref}${sep}id=${encodeURIComponent(item.id)}`;
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) {
    return "Just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h`;
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) {
    return `${diffDay}d`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
