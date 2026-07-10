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

/** Generic broadcast templates — only {{period}} is substituted at send time. */
export const EMAIL_TEMPLATE_PLACEHOLDERS: Record<string, string[]> = {
  REPORT_SUBMISSION: ["period"],
  REPORT_REMINDER: ["period"],
  INVOICE_SUBMISSION: ["period"],
  INVOICE_REMINDER: ["period"],
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
