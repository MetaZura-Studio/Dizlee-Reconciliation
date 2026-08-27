/**
 * Structured notification metadata for Dizlee inbox CTAs and OpCo upload grouping.
 */

export const OPCO_REPORTS_UPLOADED_SUBJECT = "OpCo reports uploaded";
export const OPCO_REPORT_RESUBMITTED_SUBJECT = "OpCo monthly report resubmitted";

export type NotificationPartnerRef = {
  id: string;
  name: string;
};

export type OpcoReportUploadMetadata = {
  type: "OPCO_REPORT_UPLOAD";
  groupKey: string;
  opcoId: string;
  opcoName: string;
  month: number;
  year: number;
  partners: NotificationPartnerRef[];
};

export type OpcoReportResubmittedMetadata = {
  type: "OPCO_REPORT_RESUBMITTED";
  opcoId: string;
  opcoName: string;
  month: number;
  year: number;
  partners: NotificationPartnerRef[];
};

export type ReuploadRequestMetadata = {
  type: "OPCO_REUPLOAD_REQUEST" | "PARTNER_REUPLOAD_REQUEST";
  opcoId: string;
  opcoName: string;
  partnerId: string;
  partnerName: string;
  reportId: string;
  changeRequestId: string;
  month: number;
  year: number;
};

export type PartnerLinkRequestMetadata = {
  type: "PARTNER_LINK_REQUEST";
  opcoId: string;
  opcoName?: string;
};

export type PartnerLinkDecisionMetadata = {
  type: "PARTNER_LINK_APPROVED" | "PARTNER_LINK_REJECTED";
  opcoId: string;
  opcoName?: string;
};

export type PartnerReportUploadMetadata = {
  type: "PARTNER_REPORT_UPLOAD";
  opcoId: string;
  opcoName: string;
  partnerId: string;
  partnerName: string;
  month: number;
  year: number;
};

export type NotificationMetadata =
  | OpcoReportUploadMetadata
  | OpcoReportResubmittedMetadata
  | ReuploadRequestMetadata
  | PartnerLinkRequestMetadata
  | PartnerLinkDecisionMetadata
  | PartnerReportUploadMetadata;

export type NotificationAction = {
  label: string;
  href: string;
};

export type NotificationCategory = "request" | "report" | "system";

export function opcoReportUploadGroupKey(params: {
  opcoId: string | bigint;
  year: number;
  month: number;
}): string {
  return `OPCO_REPORT_UPLOAD:${params.opcoId.toString()}:${params.year}:${params.month}`;
}

export function serializeNotificationMetadata(
  metadata: NotificationMetadata,
): string {
  return JSON.stringify(metadata);
}

export function parseNotificationMetadata(
  raw: string | null | undefined,
): NotificationMetadata | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as NotificationMetadata;
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildOpcoReportUploadBody(params: {
  opcoName: string;
  periodLabel: string;
  partners: NotificationPartnerRef[];
}): string {
  const count = params.partners.length;
  const partnerWord = count === 1 ? "partner" : "partners";
  return [
    `${params.opcoName} uploaded reports for ${count} ${partnerWord} (${params.periodLabel}).`,
    "",
    "Partners:",
    ...params.partners.map((p) => `- ${p.name}`),
  ].join("\n");
}

export function buildOpcoReportResubmittedBody(params: {
  opcoName: string;
  periodLabel: string;
  partners: NotificationPartnerRef[];
}): string {
  const count = params.partners.length;
  const partnerWord = count === 1 ? "partner" : "partners";
  return [
    `${params.opcoName} resubmitted the monthly report for ${params.periodLabel}.`,
    `${count} ${partnerWord} need reconciliation again:`,
    "",
    ...params.partners.map((p) => `- ${p.name}`),
  ].join("\n");
}

export function notificationCategory(
  metadata: NotificationMetadata | null,
  subject: string,
): NotificationCategory {
  if (
    metadata?.type === "OPCO_REPORT_UPLOAD" ||
    metadata?.type === "PARTNER_REPORT_UPLOAD" ||
    metadata?.type === "OPCO_REPORT_RESUBMITTED"
  ) {
    return "report";
  }
  if (
    metadata?.type === "OPCO_REUPLOAD_REQUEST" ||
    metadata?.type === "PARTNER_REUPLOAD_REQUEST" ||
    metadata?.type === "PARTNER_LINK_REQUEST"
  ) {
    return "request";
  }
  if (
    metadata?.type === "PARTNER_LINK_APPROVED" ||
    metadata?.type === "PARTNER_LINK_REJECTED"
  ) {
    return "system";
  }
  if (/reupload requested|link request/i.test(subject)) {
    return "request";
  }
  if (/report uploaded|reports uploaded|report resubmitted/i.test(subject)) {
    return "report";
  }
  return "system";
}

export function resolveNotificationAction(
  metadata: NotificationMetadata | null,
  subject: string,
): NotificationAction | null {
  if (metadata?.type === "OPCO_REPORT_UPLOAD") {
    const params = new URLSearchParams({
      opcoId: metadata.opcoId,
      month: String(metadata.month),
      year: String(metadata.year),
    });
    return {
      label: "View Reports",
      href: `/dizlee/reports?${params.toString()}`,
    };
  }

  if (metadata?.type === "OPCO_REPORT_RESUBMITTED") {
    const params = new URLSearchParams({
      opcoId: metadata.opcoId,
      month: String(metadata.month),
      year: String(metadata.year),
    });
    return {
      label: "Open Reconciliation",
      href: `/dizlee/reconciliation?${params.toString()}`,
    };
  }

  if (metadata?.type === "PARTNER_REPORT_UPLOAD") {
    const params = new URLSearchParams({
      opcoId: metadata.opcoId,
      partnerId: metadata.partnerId,
      month: String(metadata.month),
      year: String(metadata.year),
    });
    return {
      label: "View Reports",
      href: `/dizlee/reports?${params.toString()}`,
    };
  }

  if (
    metadata?.type === "OPCO_REUPLOAD_REQUEST" ||
    metadata?.type === "PARTNER_REUPLOAD_REQUEST"
  ) {
    const params = new URLSearchParams({
      opcoId: metadata.opcoId,
      partnerId: metadata.partnerId,
      month: String(metadata.month),
      year: String(metadata.year),
    });
    return {
      label: "View Request",
      href: `/dizlee/reports/reupload?${params.toString()}`,
    };
  }

  if (metadata?.type === "PARTNER_LINK_REQUEST") {
    // Admin handles partner links; Dizlee has no dedicated destination.
    return null;
  }

  if (
    metadata?.type === "PARTNER_LINK_APPROVED" ||
    metadata?.type === "PARTNER_LINK_REJECTED"
  ) {
    return { label: "Upload report", href: "/opco/upload" };
  }

  if (
    subject === "OpCo report reupload requested" ||
    subject === "Partner report reupload requested"
  ) {
    return { label: "View Request", href: "/dizlee/reports/reupload" };
  }

  if (subject === OPCO_REPORT_RESUBMITTED_SUBJECT) {
    return { label: "Open Reconciliation", href: "/dizlee/reconciliation" };
  }

  if (
    subject === OPCO_REPORTS_UPLOADED_SUBJECT ||
    subject === "OpCo report uploaded" ||
    subject === "Partner report uploaded"
  ) {
    return { label: "View Reports", href: "/dizlee/reports" };
  }

  return null;
}

export function opcoNameFromMetadata(
  metadata: NotificationMetadata | null,
): string | null {
  if (!metadata) {
    return null;
  }
  if ("opcoName" in metadata && metadata.opcoName) {
    return metadata.opcoName;
  }
  return null;
}

export function mergeOpcoReportUploadPartners(
  existing: NotificationPartnerRef[],
  next: NotificationPartnerRef,
): NotificationPartnerRef[] {
  if (existing.some((p) => p.id === next.id)) {
    return existing;
  }
  return [...existing, next].sort((a, b) => a.name.localeCompare(b.name));
}
