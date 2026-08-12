/**
 * Singleton `app_settings` row (id 1): SMTP defaults, reminder toggles, JSON notification schedules,
 * reconciliation negligible-percent tolerance, and Dizlee→OpCo invoice bank snapshot for local/dev.
 */

export const APP_SETTINGS_SEED = {
  emailEnabled: false,
  smtpHost: null,
  smtpPort: 587,
  senderAddress: "noreply@dizlee.com",
  remindersEnabled: true,
  reminderValue: 3,
  reminderUnit: "days",
  notificationSchedulesJson: JSON.stringify({
    enabled: true,
    dueDayOfMonth: 10,
    intimations: [
      {
        id: "intimation-1",
        dayOfMonth: 7,
        templateCode: "REPORT_SUBMISSION",
        audience: "both",
      },
      {
        id: "intimation-2",
        dayOfMonth: 9,
        templateCode: "REPORT_SUBMISSION",
        audience: "both",
      },
    ],
    reminders: [
      {
        id: "reminder-1",
        dayOfMonth: 11,
        templateCode: "REPORT_REMINDER",
        audience: "both",
      },
      {
        id: "reminder-2",
        dayOfMonth: 13,
        templateCode: "REPORT_REMINDER",
        audience: "both",
      },
    ],
  }),
  reconciliationNegligiblePercent: "2.50",
  opcoInvoiceBankDetailsJson: JSON.stringify({
    accounts: [
      {
        id: "seed-primary",
        label: "Primary settlement",
        isDefault: true,
        bankName: "Dizlee Settlement Bank",
        accountName: "Dizlee Reconciliation Ltd",
        accountNumber: null,
        iban: "JO94CBJO0010000000000131000302",
        swift: "CBJOJOAM",
        reference: null,
      },
    ],
  }),
};
