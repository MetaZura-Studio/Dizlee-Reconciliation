/**
 * Single source of truth for application error codes.
 * Server logs: ERROR {code} — {key}. Clients see simple messages only.
 * HTTP status is separate and used only for the response protocol.
 */

export type ErrorDefinition = {
  code: number;
  message: string;
  status: number;
};

/**
 * Catalog keyed by stable machine id.
 * Ranges (3-digit): 100–119 auth, 120–149 common, 150–179 org, 180–199 users,
 * 200–249 settings, 250–319 reports/storage, 320–359 invoices,
 * 360–399 recon/consolidation, 400–449 notifications, 900–909 system.
 */
export const ERROR_CATALOG = {
  // Auth 100–119
  INVALID_CREDENTIALS: {
    code: 100,
    message: "INVALID CREDENTIALS",
    status: 401,
  },
  USER_NOT_FOUND: { code: 101, message: "USER NOT FOUND", status: 404 },
  USER_NOT_ACTIVE: { code: 102, message: "USER NOT ACTIVE", status: 403 },
  PASSWORD_LINK_INVALID: {
    code: 103,
    message: "PASSWORD LINK INVALID",
    status: 400,
  },
  PASSWORD_LINK_EXPIRED: {
    code: 104,
    message: "PASSWORD LINK EXPIRED",
    status: 400,
  },
  CURRENT_PASSWORD_INCORRECT: {
    code: 105,
    message: "CURRENT PASSWORD INCORRECT",
    status: 400,
  },
  PASSWORD_MUST_DIFFER: {
    code: 106,
    message: "PASSWORD MUST DIFFER",
    status: 400,
  },
  PASSWORD_NOT_SET: { code: 107, message: "PASSWORD NOT SET", status: 400 },
  ACCOUNT_NOT_ACTIVE: {
    code: 108,
    message: "ACCOUNT NOT ACTIVE",
    status: 403,
  },
  RATE_LIMITED: {
    code: 109,
    message: "TOO MANY ATTEMPTS TRY AGAIN LATER",
    status: 429,
  },

  // Common 120–149
  UNAUTHORIZED: { code: 120, message: "UNAUTHORIZED", status: 401 },
  VALIDATION_FAILED: {
    code: 121,
    message: "VALIDATION FAILED",
    status: 400,
  },
  INVALID_REQUEST: { code: 122, message: "INVALID REQUEST", status: 400 },
  INVALID_ID: { code: 123, message: "INVALID ID", status: 400 },
  NOT_FOUND: { code: 124, message: "NOT FOUND", status: 404 },
  FILE_REQUIRED: { code: 125, message: "FILE REQUIRED", status: 400 },
  FILE_NOT_FOUND: { code: 126, message: "FILE NOT FOUND", status: 404 },
  FILE_EMPTY: { code: 127, message: "FILE EMPTY", status: 400 },
  FILE_NAME_REQUIRED: {
    code: 128,
    message: "FILE NAME REQUIRED",
    status: 400,
  },
  FILE_TOO_LARGE: { code: 129, message: "FILE TOO LARGE", status: 400 },
  ATTACHMENT_TYPE_NOT_ALLOWED: {
    code: 130,
    message: "ATTACHMENT TYPE NOT ALLOWED",
    status: 400,
  },
  INVALID_EXCEL_FILE: {
    code: 131,
    message: "INVALID EXCEL FILE",
    status: 400,
  },
  CRON_SECRET_MISSING: {
    code: 132,
    message: "CRON SECRET MISSING",
    status: 500,
  },
  PERIOD_REQUIRED: { code: 133, message: "PERIOD REQUIRED", status: 400 },
  MONTH_YEAR_REQUIRED: {
    code: 134,
    message: "MONTH AND YEAR REQUIRED",
    status: 400,
  },

  // Admin org 150–179
  OPCO_NOT_FOUND: { code: 150, message: "OPCO NOT FOUND", status: 404 },
  INVALID_OPCO_ID: { code: 135, message: "INVALID OPCO ID", status: 400 },
  PARTNER_NOT_FOUND: { code: 151, message: "PARTNER NOT FOUND", status: 404 },
  INVALID_PARTNER_ID: {
    code: 136,
    message: "INVALID PARTNER ID",
    status: 400,
  },
  CURRENCY_NOT_FOUND: {
    code: 152,
    message: "CURRENCY NOT FOUND",
    status: 404,
  },
  OPCO_PARTNER_NOT_LINKED: {
    code: 153,
    message: "OPCO PARTNER NOT LINKED",
    status: 403,
  },
  SELECT_OPCO: { code: 154, message: "SELECT OPCO", status: 400 },
  SELECT_PARTNER: { code: 155, message: "SELECT PARTNER", status: 400 },
  OPCO_REQUIRED: { code: 156, message: "OPCO REQUIRED", status: 400 },
  SELECT_OPCO_OR_PARTNER: {
    code: 157,
    message: "SELECT OPCO OR PARTNER",
    status: 400,
  },
  SELECT_AT_LEAST_ONE_OPCO: {
    code: 158,
    message: "SELECT AT LEAST ONE OPCO",
    status: 400,
  },
  SELECT_AT_LEAST_ONE_PARTNER: {
    code: 159,
    message: "SELECT AT LEAST ONE PARTNER",
    status: 400,
  },
  SELECTED_OPCOS_NOT_FOUND: {
    code: 160,
    message: "SELECTED OPCOS NOT FOUND",
    status: 400,
  },
  SELECTED_PARTNERS_NOT_FOUND: {
    code: 161,
    message: "SELECTED PARTNERS NOT FOUND",
    status: 400,
  },
  OPCO_ID_PARTNER_ID_REQUIRED: {
    code: 162,
    message: "OPCO ID AND PARTNER ID REQUIRED",
    status: 400,
  },

  // Users 180–199
  EMAIL_ALREADY_EXISTS: {
    code: 180,
    message: "EMAIL ALREADY EXISTS",
    status: 409,
  },
  ADMIN_ACCOUNT_FORBIDDEN: {
    code: 181,
    message: "ADMIN ACCOUNT FORBIDDEN",
    status: 403,
  },
  CANNOT_DELETE_OWN_ACCOUNT: {
    code: 182,
    message: "CANNOT DELETE OWN ACCOUNT",
    status: 400,
  },
  ACTIVE_STATUS_LOOKUP_MISSING: {
    code: 183,
    message: "ACTIVE STATUS LOOKUP MISSING",
    status: 500,
  },

  // Currencies / rates / settings 200–249
  CURRENCY_ISO_EXISTS: {
    code: 200,
    message: "CURRENCY ISO EXISTS",
    status: 409,
  },
  CURRENCY_IN_USE: { code: 201, message: "CURRENCY IN USE", status: 409 },
  INVALID_MONTH: { code: 202, message: "INVALID MONTH", status: 400 },
  INVALID_YEAR: { code: 203, message: "INVALID YEAR", status: 400 },
  INVALID_CURRENCY_ID: {
    code: 137,
    message: "INVALID CURRENCY ID",
    status: 400,
  },
  RATE_BASE_CURRENCY_INVALID: {
    code: 204,
    message: "RATE BASE CURRENCY INVALID",
    status: 400,
  },
  EMAIL_SETTINGS_LOAD_FAILED: {
    code: 205,
    message: "EMAIL SETTINGS LOAD FAILED",
    status: 500,
  },
  EMAIL_DISABLED: { code: 206, message: "EMAIL DISABLED", status: 400 },
  SMTP_NOT_CONFIGURED: {
    code: 207,
    message: "SMTP NOT CONFIGURED",
    status: 400,
  },
  SMTP_CREDENTIALS_MISSING: {
    code: 208,
    message: "SMTP CREDENTIALS MISSING",
    status: 400,
  },
  TEST_EMAIL_FAILED: { code: 209, message: "TEST EMAIL FAILED", status: 500 },
  EMAIL_TEMPLATE_NOT_FOUND: {
    code: 210,
    message: "EMAIL TEMPLATE NOT FOUND",
    status: 404,
  },
  TEMPLATE_VERSION_NOT_FOUND: {
    code: 211,
    message: "TEMPLATE VERSION NOT FOUND",
    status: 404,
  },
  TEMPLATE_VERSION_ALREADY_LIVE: {
    code: 212,
    message: "TEMPLATE VERSION ALREADY LIVE",
    status: 400,
  },
  BANK_DETAILS_INVALID: {
    code: 213,
    message: "BANK DETAILS INVALID",
    status: 400,
  },
  REMINDER_SETTINGS_INVALID: {
    code: 214,
    message: "REMINDER SETTINGS INVALID",
    status: 400,
  },
  TOLERANCE_INVALID: { code: 215, message: "TOLERANCE INVALID", status: 400 },
  INVALID_REMINDER_TARGET: {
    code: 216,
    message: "INVALID REMINDER TARGET",
    status: 400,
  },

  // Reports / storage 250–319
  REPORT_NOT_FOUND: { code: 250, message: "REPORT NOT FOUND", status: 404 },
  INVALID_REPORT_ID: { code: 138, message: "INVALID REPORT ID", status: 400 },
  REPORT_ALREADY_EXISTS: {
    code: 251,
    message: "REPORT ALREADY EXISTS",
    status: 409,
  },
  REPORT_STATUS_CONFIG_MISSING: {
    code: 252,
    message: "REPORT STATUS CONFIG MISSING",
    status: 500,
  },
  REPORT_PARSE_FAILED: {
    code: 253,
    message: "REPORT PARSE FAILED",
    status: 400,
  },
  REPORT_NO_WORKSHEETS: {
    code: 254,
    message: "REPORT NO WORKSHEETS",
    status: 400,
  },
  REPORT_NO_LINE_ITEMS: {
    code: 255,
    message: "REPORT NO LINE ITEMS",
    status: 400,
  },
  REPORT_COLUMNS_UNRECOGNIZED: {
    code: 256,
    message: "REPORT COLUMNS UNRECOGNIZED",
    status: 400,
  },
  REPORT_FILE_LOAD_FAILED: {
    code: 257,
    message: "REPORT FILE LOAD FAILED",
    status: 500,
  },
  REUPLOAD_NOT_ALLOWED: {
    code: 258,
    message: "REUPLOAD NOT ALLOWED",
    status: 403,
  },
  REUPLOAD_REQUEST_NOT_FOUND: {
    code: 259,
    message: "REUPLOAD REQUEST NOT FOUND",
    status: 404,
  },
  REUPLOAD_REQUEST_EXISTS: {
    code: 260,
    message: "REUPLOAD REQUEST EXISTS",
    status: 409,
  },
  REUPLOAD_REQUEST_UNAVAILABLE: {
    code: 261,
    message: "REUPLOAD REQUEST UNAVAILABLE",
    status: 400,
  },
  REUPLOAD_APPROVED_REQUIRED: {
    code: 262,
    message: "REUPLOAD APPROVED REQUIRED",
    status: 403,
  },
  REUPLOAD_ONLY_SUBMITTED: {
    code: 263,
    message: "REUPLOAD ONLY SUBMITTED",
    status: 400,
  },
  REUPLOAD_SUBMIT_FAILED: {
    code: 264,
    message: "REUPLOAD SUBMIT FAILED",
    status: 500,
  },
  INVALID_UPLOAD_DETAILS: {
    code: 265,
    message: "INVALID UPLOAD DETAILS",
    status: 400,
  },
  STORAGE_NOT_CONFIGURED: {
    code: 266,
    message: "STORAGE NOT CONFIGURED",
    status: 500,
  },
  STORAGE_OBJECT_NOT_FOUND: {
    code: 267,
    message: "STORAGE OBJECT NOT FOUND",
    status: 404,
  },
  STORAGE_READ_FAILED: {
    code: 268,
    message: "STORAGE READ FAILED",
    status: 500,
  },
  STORAGE_WRITE_FAILED: {
    code: 269,
    message: "STORAGE WRITE FAILED",
    status: 500,
  },
  OPCO_UNLINKED_PARTNERS_IN_FILE: {
    code: 270,
    message: "OPCO UNLINKED PARTNERS IN FILE",
    status: 409,
  },

  // Invoices 320–359
  INVOICE_NOT_FOUND: { code: 320, message: "INVOICE NOT FOUND", status: 404 },
  INVALID_INVOICE_ID: {
    code: 321,
    message: "INVALID INVOICE ID",
    status: 400,
  },
  INVOICE_ALREADY_EXISTS: {
    code: 322,
    message: "INVOICE ALREADY EXISTS",
    status: 409,
  },
  INVOICE_NUMBER_IN_USE: {
    code: 323,
    message: "INVOICE NUMBER IN USE",
    status: 409,
  },
  INVOICE_ALREADY_PAID: {
    code: 324,
    message: "INVOICE ALREADY PAID",
    status: 400,
  },
  INVOICE_PERIOD_MONTH_INVALID: {
    code: 325,
    message: "INVOICE PERIOD MONTH INVALID",
    status: 400,
  },
  INVOICE_PERIOD_YEAR_INVALID: {
    code: 326,
    message: "INVOICE PERIOD YEAR INVALID",
    status: 400,
  },
  INVOICE_PERIOD_FUTURE: {
    code: 327,
    message: "INVOICE PERIOD FUTURE",
    status: 400,
  },
  INVOICE_LINE_ITEMS_REQUIRED: {
    code: 328,
    message: "INVOICE LINE ITEMS REQUIRED",
    status: 400,
  },
  INVOICE_LINE_ITEM_INVALID: {
    code: 329,
    message: "INVOICE LINE ITEM INVALID",
    status: 400,
  },
  INVOICE_BANK_ACCOUNT_REQUIRED: {
    code: 330,
    message: "INVOICE BANK ACCOUNT REQUIRED",
    status: 400,
  },
  INVOICE_STATUS_LOOKUP_MISSING: {
    code: 331,
    message: "INVOICE STATUS LOOKUP MISSING",
    status: 500,
  },
  INVOICE_CREATE_LOAD_FAILED: {
    code: 332,
    message: "INVOICE CREATE LOAD FAILED",
    status: 500,
  },
  INVOICE_UPDATE_LOAD_FAILED: {
    code: 333,
    message: "INVOICE UPDATE LOAD FAILED",
    status: 500,
  },
  INVOICE_PREVIEW_FAILED: {
    code: 334,
    message: "INVOICE PREVIEW FAILED",
    status: 500,
  },
  INVOICE_FILE_UNAVAILABLE: {
    code: 335,
    message: "INVOICE FILE UNAVAILABLE",
    status: 404,
  },
  INVOICE_MARK_PAID_FORBIDDEN: {
    code: 336,
    message: "INVOICE MARK PAID FORBIDDEN",
    status: 400,
  },
  INVOICE_UPLOAD_FAILED: {
    code: 337,
    message: "INVOICE UPLOAD FAILED",
    status: 400,
  },

  // Reconciliation / consolidation 360–399
  RECONCILIATION_NOT_FOUND: {
    code: 360,
    message: "RECONCILIATION NOT FOUND",
    status: 404,
  },
  INVALID_RECONCILIATION_ID: {
    code: 361,
    message: "INVALID RECONCILIATION ID",
    status: 400,
  },
  OPCO_REPORT_NOT_FOUND: {
    code: 362,
    message: "OPCO REPORT NOT FOUND",
    status: 404,
  },
  PARTNER_REPORT_NOT_FOUND: {
    code: 363,
    message: "PARTNER REPORT NOT FOUND",
    status: 404,
  },
  REPORTS_OPCO_MISMATCH: {
    code: 364,
    message: "REPORTS OPCO MISMATCH",
    status: 400,
  },
  LANE_ALREADY_RECONCILED: {
    code: 365,
    message: "LANE ALREADY RECONCILED",
    status: 400,
  },
  RECONCILIATION_CONFIRM_FORBIDDEN: {
    code: 366,
    message: "RECONCILIATION CONFIRM FORBIDDEN",
    status: 400,
  },
  RECONCILIATION_ALREADY_CONFIRMED: {
    code: 367,
    message: "RECONCILIATION ALREADY CONFIRMED",
    status: 400,
  },
  CONSOLIDATION_NOT_FOUND: {
    code: 368,
    message: "CONSOLIDATION NOT FOUND",
    status: 404,
  },
  INVALID_CONSOLIDATION_ID: {
    code: 139,
    message: "INVALID CONSOLIDATION ID",
    status: 400,
  },
  CONSOLIDATION_NO_PARTNERS: {
    code: 369,
    message: "CONSOLIDATION NO PARTNERS",
    status: 400,
  },
  CONSOLIDATION_NO_LINE_ITEMS: {
    code: 370,
    message: "CONSOLIDATION NO LINE ITEMS",
    status: 400,
  },
  PERIOD_OPCO_REQUIRED: {
    code: 140,
    message: "PERIOD AND OPCO REQUIRED",
    status: 400,
  },
  PERIOD_OPCO_PARTNER_REQUIRED: {
    code: 141,
    message: "PERIOD OPCO AND PARTNER REQUIRED",
    status: 400,
  },

  // Notifications 400–449
  NOTIFICATION_NOT_FOUND: {
    code: 400,
    message: "NOTIFICATION NOT FOUND",
    status: 404,
  },
  INVALID_NOTIFICATION_ID: {
    code: 142,
    message: "INVALID NOTIFICATION ID",
    status: 400,
  },
  SUBJECT_REQUIRED: { code: 143, message: "SUBJECT REQUIRED", status: 400 },
  SUBJECT_TOO_LONG: { code: 144, message: "SUBJECT TOO LONG", status: 400 },
  MESSAGE_BODY_REQUIRED: {
    code: 145,
    message: "MESSAGE BODY REQUIRED",
    status: 400,
  },
  TEMPLATE_NOT_FOUND: {
    code: 217,
    message: "TEMPLATE NOT FOUND",
    status: 400,
  },
  EXPIRY_DATE_INVALID: {
    code: 146,
    message: "EXPIRY DATE INVALID",
    status: 400,
  },
  ATTACHMENTS_INVALID: {
    code: 401,
    message: "ATTACHMENTS INVALID",
    status: 400,
  },
  NOTIFICATION_LOAD_FAILED: {
    code: 402,
    message: "NOTIFICATION LOAD FAILED",
    status: 500,
  },
  NOTIFICATION_DISMISS_FAILED: {
    code: 403,
    message: "NOTIFICATION DISMISS FAILED",
    status: 500,
  },
  NO_REMINDERS_SENT: { code: 404, message: "NO REMINDERS SENT", status: 400 },
  NO_MISSING_INVOICES: {
    code: 405,
    message: "NO MISSING INVOICES",
    status: 400,
  },

  // System 900–909
  SYSTEM_ERROR: { code: 900, message: "SYSTEM ERROR", status: 500 },
  UNMAPPED_ERROR: { code: 901, message: "UNMAPPED ERROR", status: 500 },
} as const satisfies Record<string, ErrorDefinition>;

export type ErrorKey = keyof typeof ERROR_CATALOG;

export function isErrorKey(value: string): value is ErrorKey {
  return Object.prototype.hasOwnProperty.call(ERROR_CATALOG, value);
}

export function getErrorDefinition(key: ErrorKey): ErrorDefinition {
  return ERROR_CATALOG[key];
}

/** Normalize legacy free-text messages to catalog keys. */
const MESSAGE_ALIASES: Record<string, ErrorKey> = {
  Unauthorized: "UNAUTHORIZED",
  "Invalid request": "INVALID_REQUEST",
  "Invalid input": "VALIDATION_FAILED",
  "Invalid id": "INVALID_ID",
  "User not found": "USER_NOT_FOUND",
  "User account is not active": "USER_NOT_ACTIVE",
  "This account is not active": "ACCOUNT_NOT_ACTIVE",
  "This link is invalid or has expired": "PASSWORD_LINK_INVALID",
  "This link has expired. Request a new one.": "PASSWORD_LINK_EXPIRED",
  "Current password is incorrect": "CURRENT_PASSWORD_INCORRECT",
  "New password must be different from the current password":
    "PASSWORD_MUST_DIFFER",
  "No password is set yet. Use the link from your invite email.":
    "PASSWORD_NOT_SET",
  "File is required.": "FILE_REQUIRED",
  "File is required": "FILE_REQUIRED",
  "File not found": "FILE_NOT_FOUND",
  "File is empty.": "FILE_EMPTY",
  "File name is required.": "FILE_NAME_REQUIRED",
  "Each attachment must be 10 MB or smaller.": "FILE_TOO_LARGE",
  "Attachment type is not allowed. Use PDF, images (not SVG), Excel, CSV, or TXT.":
    "ATTACHMENT_TYPE_NOT_ALLOWED",
  "File must be an Excel workbook (.xlsx)": "INVALID_EXCEL_FILE",
  "Upload an Excel file in the file field": "FILE_REQUIRED",
  "CRON_SECRET is not configured.": "CRON_SECRET_MISSING",
  "month and year are required": "MONTH_YEAR_REQUIRED",
  "Month and year are required when using a template.": "MONTH_YEAR_REQUIRED",
  "Valid period is required.": "PERIOD_REQUIRED",
  "Period is required.": "PERIOD_REQUIRED",
  "OpCo not found": "OPCO_NOT_FOUND",
  "OpCo not found.": "OPCO_NOT_FOUND",
  "Selected OpCo was not found": "OPCO_NOT_FOUND",
  "Selected OpCo was not found.": "OPCO_NOT_FOUND",
  "Invalid OpCo id": "INVALID_OPCO_ID",
  "Partner not found": "PARTNER_NOT_FOUND",
  "Selected Partner was not found": "PARTNER_NOT_FOUND",
  "Selected Partner was not found.": "PARTNER_NOT_FOUND",
  "Invalid Partner id": "INVALID_PARTNER_ID",
  "Invalid partner ID": "INVALID_PARTNER_ID",
  "Currency not found": "CURRENCY_NOT_FOUND",
  "Currency not found.": "CURRENCY_NOT_FOUND",
  "Selected currency was not found": "CURRENCY_NOT_FOUND",
  "OpCo is not linked to this partner": "OPCO_PARTNER_NOT_LINKED",
  "Partner is not linked to this OpCo": "OPCO_PARTNER_NOT_LINKED",
  "Select an OpCo": "SELECT_OPCO",
  "Select a Partner": "SELECT_PARTNER",
  "OpCo is required.": "OPCO_REQUIRED",
  "Select at least one OpCo or Partner.": "SELECT_OPCO_OR_PARTNER",
  "Select at least one OpCo.": "SELECT_AT_LEAST_ONE_OPCO",
  "Select at least one Partner.": "SELECT_AT_LEAST_ONE_PARTNER",
  "One or more selected OpCos were not found.": "SELECTED_OPCOS_NOT_FOUND",
  "One or more selected Partners were not found.":
    "SELECTED_PARTNERS_NOT_FOUND",
  "opcoId and partnerId are required.": "OPCO_ID_PARTNER_ID_REQUIRED",
  "A user with this email already exists": "EMAIL_ALREADY_EXISTS",
  "Admin accounts cannot be managed here": "ADMIN_ACCOUNT_FORBIDDEN",
  "You cannot delete your own account": "CANNOT_DELETE_OWN_ACCOUNT",
  "Active status lookup is missing": "ACTIVE_STATUS_LOOKUP_MISSING",
  "A currency with this ISO code already exists": "CURRENCY_ISO_EXISTS",
  "This currency is in use and cannot be deleted.": "CURRENCY_IN_USE",
  "Invalid month": "INVALID_MONTH",
  "Invalid year": "INVALID_YEAR",
  "Invalid currency ID": "INVALID_CURRENCY_ID",
  "Application settings could not be loaded.": "EMAIL_SETTINGS_LOAD_FAILED",
  "Email is disabled. Enable it in Email Settings and save.": "EMAIL_DISABLED",
  "SMTP is not configured. Save SMTP host, port, and sender in Email Settings, and set SMTP_USER / SMTP_PASSWORD in .env.":
    "SMTP_NOT_CONFIGURED",
  "SMTP credentials are missing. Set SMTP_USER and SMTP_PASSWORD in .env, then restart the server.":
    "SMTP_CREDENTIALS_MISSING",
  "Failed to send test email.": "TEST_EMAIL_FAILED",
  "Email template not found": "EMAIL_TEMPLATE_NOT_FOUND",
  "Template version not found": "TEMPLATE_VERSION_NOT_FOUND",
  "That version is already live.": "TEMPLATE_VERSION_ALREADY_LIVE",
  "Invalid reminder target.": "INVALID_REMINDER_TARGET",
  "Report not found": "REPORT_NOT_FOUND",
  "Invalid report id": "INVALID_REPORT_ID",
  "A report already exists for this OpCo and period": "REPORT_ALREADY_EXISTS",
  "A report already exists for this partner and period":
    "REPORT_ALREADY_EXISTS",
  "Report status configuration is missing": "REPORT_STATUS_CONFIG_MISSING",
  "Failed to parse report": "REPORT_PARSE_FAILED",
  "Workbook does not contain any worksheets": "REPORT_NO_WORKSHEETS",
  "Excel file does not contain any report line items": "REPORT_NO_LINE_ITEMS",
  "No recognized columns found. Expected headers such as description, usage_amount, usage_usd, service name, or gross amount.":
    "REPORT_COLUMNS_UNRECOGNIZED",
  "Failed to load report file": "REPORT_FILE_LOAD_FAILED",
  "Reupload is only allowed after Dizlee approves a change request":
    "REUPLOAD_NOT_ALLOWED",
  "Reupload request not found": "REUPLOAD_REQUEST_NOT_FOUND",
  "A pending reupload request already exists for this report":
    "REUPLOAD_REQUEST_EXISTS",
  "Reupload request is no longer available": "REUPLOAD_REQUEST_UNAVAILABLE",
  "No approved reupload request found for this report":
    "REUPLOAD_APPROVED_REQUIRED",
  "Only submitted reports can have a reupload requested":
    "REUPLOAD_ONLY_SUBMITTED",
  "Failed to submit reupload request": "REUPLOAD_SUBMIT_FAILED",
  "Invalid upload details": "INVALID_UPLOAD_DETAILS",
  "File storage is not configured. Set BLOB_READ_WRITE_TOKEN on Vercel (Storage → Blob → read-write token), then redeploy.":
    "STORAGE_NOT_CONFIGURED",
  "File storage is not configured. Set BLOB_READ_WRITE_TOKEN on Vercel.":
    "STORAGE_NOT_CONFIGURED",
  "Stored object not found in blob storage": "STORAGE_OBJECT_NOT_FOUND",
  "Invoice not found": "INVOICE_NOT_FOUND",
  "Invoice not found.": "INVOICE_NOT_FOUND",
  "Invalid invoice id": "INVALID_INVOICE_ID",
  "An invoice already exists for this period": "INVOICE_ALREADY_EXISTS",
  "An invoice for this OpCo and period already exists.":
    "INVOICE_ALREADY_EXISTS",
  "Invoice number is already in use": "INVOICE_NUMBER_IN_USE",
  "Invoice is already marked as paid.": "INVOICE_ALREADY_PAID",
  "Invalid invoice period month.": "INVOICE_PERIOD_MONTH_INVALID",
  "Invalid invoice period year.": "INVOICE_PERIOD_YEAR_INVALID",
  "Invoice period cannot be in the future.": "INVOICE_PERIOD_FUTURE",
  "At least one line item is required.": "INVOICE_LINE_ITEMS_REQUIRED",
  "Select a bank account for this invoice.": "INVOICE_BANK_ACCOUNT_REQUIRED",
  "Invoice status lookups are not configured.": "INVOICE_STATUS_LOOKUP_MISSING",
  "Failed to load created invoice.": "INVOICE_CREATE_LOAD_FAILED",
  "Failed to load updated invoice.": "INVOICE_UPDATE_LOAD_FAILED",
  "Failed to load invoice preview": "INVOICE_PREVIEW_FAILED",
  "Invoice file is not available in storage.": "INVOICE_FILE_UNAVAILABLE",
  "Only Dizlee → OpCo or Partner → Dizlee invoices can be marked paid.":
    "INVOICE_MARK_PAID_FORBIDDEN",
  "Reconciliation not found": "RECONCILIATION_NOT_FOUND",
  "Reconciliation not found.": "RECONCILIATION_NOT_FOUND",
  "Invalid reconciliation id": "INVALID_RECONCILIATION_ID",
  "OpCo report not found for this selection.": "OPCO_REPORT_NOT_FOUND",
  "Partner report not found for this selection.": "PARTNER_REPORT_NOT_FOUND",
  "Partner and OpCo reports must be for the same OpCo.":
    "REPORTS_OPCO_MISMATCH",
  "Lane is already reconciled and cannot be re-run.": "LANE_ALREADY_RECONCILED",
  "Only in-progress reconciliations can be confirmed.":
    "RECONCILIATION_CONFIRM_FORBIDDEN",
  "Reconciliation is already CONFIRMED and cannot be reverted to DRAFT.":
    "RECONCILIATION_ALREADY_CONFIRMED",
  "Consolidation not found.": "CONSOLIDATION_NOT_FOUND",
  "Invalid consolidation id.": "INVALID_CONSOLIDATION_ID",
  "This OpCo has no linked partners to consolidate.":
    "CONSOLIDATION_NO_PARTNERS",
  "No line items found in OpCo reports for this period.":
    "CONSOLIDATION_NO_LINE_ITEMS",
  "Period and OpCo are required.": "PERIOD_OPCO_REQUIRED",
  "Period, OpCo, and Partner are required.": "PERIOD_OPCO_PARTNER_REQUIRED",
  "Notification not found": "NOTIFICATION_NOT_FOUND",
  "Notification not found.": "NOTIFICATION_NOT_FOUND",
  "Notification not found in your inbox.": "NOTIFICATION_NOT_FOUND",
  "Invalid notification id": "INVALID_NOTIFICATION_ID",
  "Subject is required.": "SUBJECT_REQUIRED",
  "Subject must be 255 characters or fewer.": "SUBJECT_TOO_LONG",
  "Message body is required.": "MESSAGE_BODY_REQUIRED",
  "Selected template was not found.": "TEMPLATE_NOT_FOUND",
  "Expiry date is invalid.": "EXPIRY_DATE_INVALID",
  "One or more attachments are invalid or no longer available.":
    "ATTACHMENTS_INVALID",
  "Failed to load notification": "NOTIFICATION_LOAD_FAILED",
  "Failed to dismiss notification": "NOTIFICATION_DISMISS_FAILED",
  "No reminders were sent — no missing reports match the selected target.":
    "NO_REMINDERS_SENT",
  "No OpCo–Partner pairs with missing invoices found for this period.":
    "NO_MISSING_INVOICES",
};

export function resolveErrorKeyFromMessage(message: string): ErrorKey | null {
  const trimmed = message.trim();
  if (isErrorKey(trimmed)) {
    return trimmed;
  }
  if (MESSAGE_ALIASES[trimmed]) {
    return MESSAGE_ALIASES[trimmed];
  }
  // Template / dynamic messages
  if (/^Line item \d+ /.test(trimmed)) {
    return "INVOICE_LINE_ITEM_INVALID";
  }
  if (trimmed.startsWith("File storage (Blob) read failed")) {
    return "STORAGE_READ_FAILED";
  }
  if (trimmed.startsWith("File storage (Blob) write failed")) {
    return "STORAGE_WRITE_FAILED";
  }
  if (trimmed.includes("ISO code") && trimmed.includes("already")) {
    return "CURRENCY_ISO_EXISTS";
  }
  return null;
}
