export const BROADCAST_TEMPLATE_CODES = [
  "REPORT_SUBMISSION",
  "REPORT_REMINDER",
  "INVOICE_SUBMISSION",
  "INVOICE_REMINDER",
] as const;

export type BroadcastTemplateCode = (typeof BROADCAST_TEMPLATE_CODES)[number];
export type BroadcastAudience = "opco" | "partner" | "both";
export type BroadcastMessageSource = "custom" | BroadcastTemplateCode;

export type BroadcastTemplateOption = {
  code: BroadcastTemplateCode;
  name: string;
  subject: string;
  body: string;
};

export type IntimationFormOptions = {
  opcos: Array<{ id: string; name: string }>;
  partners: Array<{ id: string; name: string }>;
  templates: BroadcastTemplateOption[];
};

export type IntimationListItem = {
  id: string;
  subject: string;
  bodyPreview: string;
  recipientSummary: string;
  recipientCount: number;
  sentAt: string;
  sentBy: string;
  priority: string | null;
};

export type IntimationListResult = {
  items: IntimationListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
};

export type SendBroadcastInput = {
  audience: BroadcastAudience;
  opcoIds: string[];
  partnerIds: string[];
  messageSource: BroadcastMessageSource;
  month?: number;
  year?: number;
  subject?: string;
  body?: string;
  priority?: string | null;
  expiresAt?: string | null;
};

export const DEFAULT_REMINDER_MESSAGE_SOURCE: BroadcastTemplateCode =
  "REPORT_REMINDER";

export type ReminderSettingsView = {
  remindersEnabled: boolean;
  reminderValue: number | null;
  reminderUnit: string | null;
  templates: BroadcastTemplateOption[];
};

export type SendReportRemindersInput = {
  month: number;
  year: number;
  laneKeys: string[];
  target: "opco" | "partner" | "both";
  messageSource: BroadcastTemplateCode;
  subject?: string;
  body?: string;
};

export type SendReportRemindersResult = {
  opcoNotifications: number;
  partnerNotifications: number;
  message: string;
};

export function isBroadcastTemplateCode(
  value: string,
): value is BroadcastTemplateCode {
  return (BROADCAST_TEMPLATE_CODES as readonly string[]).includes(value);
}
