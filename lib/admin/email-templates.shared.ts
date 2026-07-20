export type EmailTemplateCategory = "INTIMATION" | "REMINDER" | "OTHER";

export const EMAIL_TEMPLATE_CATEGORIES: EmailTemplateCategory[] = [
  "INTIMATION",
  "REMINDER",
  "OTHER",
];

export type EmailTemplateListItem = {
  code: string;
  name: string;
  category: EmailTemplateCategory;
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
  category: EmailTemplateCategory;
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

/** Documented placeholders per known template code. */
export const EMAIL_TEMPLATE_PLACEHOLDERS: Record<string, string[]> = {
  REPORT_SUBMISSION: ["period"],
  REPORT_REMINDER: ["period"],
  INVOICE_SUBMISSION: ["period"],
  INVOICE_REMINDER: ["period"],
  PASSWORD_INVITE: ["name", "link", "expiryHours"],
  PASSWORD_FORGOT: ["name", "link", "expiryHours"],
};

export function isEmailTemplateCategory(
  value: string,
): value is EmailTemplateCategory {
  return (EMAIL_TEMPLATE_CATEGORIES as readonly string[]).includes(value);
}

export function categoryLabel(category: EmailTemplateCategory): string {
  switch (category) {
    case "INTIMATION":
      return "Intimation";
    case "REMINDER":
      return "Reminder";
    case "OTHER":
      return "Other";
  }
}

/** Map legacy domain categories / codes to communication-type categories. */
export function inferCategoryFromCode(code: string): EmailTemplateCategory {
  const normalized = code.trim().toUpperCase();
  if (normalized.includes("REMINDER")) {
    return "REMINDER";
  }
  if (
    normalized.includes("SUBMISSION") ||
    normalized.includes("INTIMATION") ||
    normalized.startsWith("REPORT_") ||
    normalized.startsWith("INVOICE_")
  ) {
    return "INTIMATION";
  }
  return "OTHER";
}

function mapLegacyCategory(
  value: string,
  code: string,
): EmailTemplateCategory | null {
  const normalized = value.trim().toUpperCase();
  if (isEmailTemplateCategory(normalized)) {
    return normalized;
  }
  // Pre-migration domain categories
  if (normalized === "REPORTS" || normalized === "INVOICES") {
    return inferCategoryFromCode(code);
  }
  return null;
}

export function normalizeEmailTemplateCategory(
  value: string | null | undefined,
  code: string,
): EmailTemplateCategory {
  if (value) {
    const mapped = mapLegacyCategory(value, code);
    if (mapped) {
      return mapped;
    }
  }
  return inferCategoryFromCode(code);
}

export function getPlaceholdersForTemplate(
  code: string,
  category?: EmailTemplateCategory,
): string[] {
  const documented = EMAIL_TEMPLATE_PLACEHOLDERS[code];
  if (documented) {
    return documented;
  }
  if (code.startsWith("PASSWORD_")) {
    return ["name", "link", "expiryHours"];
  }
  const resolved = category ?? inferCategoryFromCode(code);
  if (resolved === "INTIMATION" || resolved === "REMINDER") {
    return ["period"];
  }
  return [];
}

export function formatPlaceholderTokens(placeholders: string[]): string {
  if (placeholders.length === 0) {
    return "None documented";
  }
  return placeholders.map((token) => `{{${token}}}`).join(", ");
}

/** Suggest a CODE from display name, e.g. "Custom notice" → CUSTOM_NOTICE */
export function suggestTemplateCodeFromName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}
