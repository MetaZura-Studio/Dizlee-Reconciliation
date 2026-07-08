export type EmailTemplateListItem = {
  code: string;
  name: string;
  subject: string;
  currentVersion: number;
};

export type EmailTemplateVersionItem = {
  version: number;
  subject: string;
  body: string;
  changeNote: string | null;
  createdAt: string;
};

export type EmailTemplateDetail = {
  code: string;
  name: string;
  subject: string;
  body: string;
  currentVersion: number;
  placeholders: string[];
  versions: EmailTemplateVersionItem[];
};

export type EmailTemplatesPageData = {
  templates: EmailTemplateListItem[];
  selected: EmailTemplateDetail | null;
};

export const EMAIL_TEMPLATE_PLACEHOLDERS: Record<string, string[]> = {
  REPORT_REMINDER: ["period", "opco_name", "partner_name", "lane"],
  PASSWORD_RESET: ["name", "link", "expiry_hours"],
  INVOICE_SENT: ["period", "opco_name", "partner_name"],
  INVOICE_REMINDER: ["period", "opco_name", "partner_name"],
  TEST_EMAIL: ["message"],
  NOTIFICATION_EMAIL: ["message"],
};

export function getPlaceholdersForTemplate(code: string): string[] {
  return EMAIL_TEMPLATE_PLACEHOLDERS[code] ?? [];
}

export function formatPlaceholderTokens(placeholders: string[]): string {
  if (placeholders.length === 0) {
    return "None documented";
  }
  return placeholders.map((token) => `{{${token}}}`).join(", ");
}
