/**
 * DB-backed notification/email template seeds with version history stubs.
 * Categories: INTIMATION, REMINDER, ALERT (reconciliation), and OTHER (password flows).
 */

export type EmailTemplateCategory =
  | "INTIMATION"
  | "REMINDER"
  | "ALERT"
  | "OTHER";

export type NotificationTemplateSeed = {
  code: string;
  name: string;
  category: EmailTemplateCategory;
  subject: string;
  body: string;
  versions: Array<{
    version: number;
    subject: string;
    body: string;
    changeNote?: string;
  }>;
};

const PASSWORD_INVITE_BODY = `Hi {{name}},

An administrator created your account. Use the link below to choose a password and sign in.

{{link}}

This link expires in {{expiryHours}} hour(s) and can only be used once.

If you did not expect this email, you can ignore it.

— Dizlee Reconciliation`;

const PASSWORD_FORGOT_BODY = `Hi {{name}},

We received a request to reset your password. Use the link below to choose a new one.

{{link}}

This link expires in {{expiryHours}} hour(s) and can only be used once.

If you did not expect this email, you can ignore it.

— Dizlee Reconciliation`;

const RECONCILIATION_ALERT_OPCO_BODY = `Hello,

Reconciliation results for {{opcoName}} / {{partnerName}} ({{period}}):

- Status: {{status}}
- Matched: {{matchedCount}}
- Unmatched: {{unmatchedCount}}
- Total variance: {{totalVariance}}
- Tolerance: {{tolerancePercent}}%

Outcome: {{outcome}}.

Please review the reconciliation result in Dizlee.`;

const RECONCILIATION_ALERT_PARTNER_BODY = `Hello,

Reconciliation results for {{opcoName}} / {{partnerName}} ({{period}}):

- Status: {{status}}
- Matched: {{matchedCount}}
- Unmatched: {{unmatchedCount}}
- Total variance: {{totalVariance}}
- Tolerance: {{tolerancePercent}}%

Outcome: {{outcome}}.

Please review the reconciliation result in Dizlee.`;

export const NOTIFICATION_TEMPLATE_SEEDS: NotificationTemplateSeed[] = [
  {
    code: "REPORT_SUBMISSION",
    name: "Report submission notice",
    category: "INTIMATION",
    subject: "Monthly report submission",
    body: "Please submit your monthly report for {{period}} through the portal when it is ready.",
    versions: [
      {
        version: 1,
        subject: "Monthly report submission",
        body: "Please submit your monthly report for {{period}} through the portal when it is ready.",
      },
    ],
  },
  {
    code: "REPORT_REMINDER",
    name: "Report reminder",
    category: "REMINDER",
    subject: "Report submission reminder",
    body: "Your monthly report for {{period}} is still missing. Please log in and upload it as soon as possible.",
    versions: [
      {
        version: 1,
        subject: "Report submission reminder",
        body: "Your monthly report for {{period}} is still missing. Please log in and upload it as soon as possible.",
      },
    ],
  },
  {
    code: "INVOICE_SUBMISSION",
    name: "Invoice submission notice",
    category: "INTIMATION",
    subject: "Monthly invoice submission",
    body: "Please submit your monthly invoice for {{period}} through the portal when it is ready.",
    versions: [
      {
        version: 1,
        subject: "Monthly invoice submission",
        body: "Please submit your monthly invoice for {{period}} through the portal when it is ready.",
      },
    ],
  },
  {
    code: "INVOICE_REMINDER",
    name: "Invoice reminder",
    category: "REMINDER",
    subject: "Invoice submission reminder",
    body: "Your monthly invoice for {{period}} is still missing. Please log in and upload it as soon as possible.",
    versions: [
      {
        version: 1,
        subject: "Invoice submission reminder",
        body: "Your monthly invoice for {{period}} is still missing. Please log in and upload it as soon as possible.",
      },
    ],
  },
  {
    code: "RECONCILIATION_ALERT_OPCO",
    name: "Reconciliation alert (OpCo)",
    category: "ALERT",
    subject:
      "Reconciliation update — {{opcoName}} / {{partnerName}} ({{period}})",
    body: RECONCILIATION_ALERT_OPCO_BODY,
    versions: [
      {
        version: 1,
        subject:
          "Reconciliation update — {{opcoName}} / {{partnerName}} ({{period}})",
        body: RECONCILIATION_ALERT_OPCO_BODY,
      },
    ],
  },
  {
    code: "RECONCILIATION_ALERT_PARTNER",
    name: "Reconciliation alert (Partner)",
    category: "ALERT",
    subject:
      "Reconciliation update — {{opcoName}} / {{partnerName}} ({{period}})",
    body: RECONCILIATION_ALERT_PARTNER_BODY,
    versions: [
      {
        version: 1,
        subject:
          "Reconciliation update — {{opcoName}} / {{partnerName}} ({{period}})",
        body: RECONCILIATION_ALERT_PARTNER_BODY,
      },
    ],
  },
  {
    code: "PASSWORD_INVITE",
    name: "Password invite",
    category: "OTHER",
    subject: "Set your Dizlee Reconciliation password",
    body: PASSWORD_INVITE_BODY,
    versions: [
      {
        version: 1,
        subject: "Set your Dizlee Reconciliation password",
        body: PASSWORD_INVITE_BODY,
      },
    ],
  },
  {
    code: "PASSWORD_FORGOT",
    name: "Password reset",
    category: "OTHER",
    subject: "Reset your Dizlee Reconciliation password",
    body: PASSWORD_FORGOT_BODY,
    versions: [
      {
        version: 1,
        subject: "Reset your Dizlee Reconciliation password",
        body: PASSWORD_FORGOT_BODY,
      },
    ],
  },
];
