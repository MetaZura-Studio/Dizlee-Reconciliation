export type EmailTemplateCategory = "INTIMATION" | "REMINDER" | "OTHER";

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

/** Admin-editable templates; outreach grouped by Intimation / Reminder. */
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
