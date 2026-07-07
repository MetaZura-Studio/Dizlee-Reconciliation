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

export const NOTIFICATION_TEMPLATE_SEEDS: NotificationTemplateSeed[] = [
  {
    code: "PASSWORD_RESET",
    name: "Password Reset",
    subject: "Reset your password",
    body: "Use the link to reset your password.",
    versions: [
      {
        version: 1,
        subject: "Reset your password",
        body: "Use the link to reset your password.",
      },
    ],
  },
  {
    code: "TEST_EMAIL",
    name: "Test Email",
    subject: "Test email from Dizlee",
    body: "This is a test email.",
    versions: [
      {
        version: 1,
        subject: "Test email from Dizlee",
        body: "This is a test email.",
      },
    ],
  },
  {
    code: "NOTIFICATION_EMAIL",
    name: "Notification Email",
    subject: "Notification",
    body: "You have a new notification.",
    versions: [
      {
        version: 1,
        subject: "Notification",
        body: "You have a new notification.",
      },
    ],
  },
  {
    code: "INVOICE_SENT",
    name: "Invoice Sent",
    subject: "Invoice sent",
    body: "An invoice has been sent.",
    versions: [
      {
        version: 1,
        subject: "Invoice sent",
        body: "An invoice has been sent.",
      },
      {
        version: 2,
        subject: "Your invoice is ready",
        body: "Your invoice has been issued and is available in the portal.",
        changeNote: "Updated subject and body for clarity",
      },
    ],
  },
  {
    code: "REPORT_REMINDER",
    name: "Report Reminder",
    subject: "Report submission reminder",
    body: "Please submit your report.",
    versions: [
      {
        version: 1,
        subject: "Report submission reminder",
        body: "Please submit your report.",
      },
    ],
  },
  {
    code: "INVOICE_REMINDER",
    name: "Invoice Reminder",
    subject: "Invoice submission reminder",
    body: "Please submit your invoice.",
    versions: [
      {
        version: 1,
        subject: "Invoice submission reminder",
        body: "Please submit your invoice.",
      },
    ],
  },
];
