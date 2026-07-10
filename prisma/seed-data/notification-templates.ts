export type NotificationTemplateSeed = {
  code: string;
  name: string;
  subject: string;
  body: string;
  versions: Array<{
    version: number;
    subject: string;
    body: string;
    changeNote?: string;
  }>;
};

/** Admin-editable broadcast templates. Password emails stay hardcoded in lib/auth/password-email-content.ts */
export const NOTIFICATION_TEMPLATE_SEEDS: NotificationTemplateSeed[] = [
  {
    code: "REPORT_SUBMISSION",
    name: "Report submission notice",
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
];
