export const APP_SETTINGS_SEED = {
  emailEnabled: false,
  smtpHost: null,
  smtpPort: 587,
  senderAddress: "noreply@dizlee.com",
  remindersEnabled: true,
  reminderValue: 3,
  reminderUnit: "days",
  notificationSchedulesJson: JSON.stringify([
    {
      eventCode: "REPORT",
      enabled: true,
      dueDayOfMonth: 10,
      intimations: [
        { id: "report-intimation-1", offsetDays: 3 },
        { id: "report-intimation-2", offsetDays: 1 },
      ],
      reminders: [
        { id: "report-reminder-1", offsetDays: 1 },
        { id: "report-reminder-2", offsetDays: 3 },
      ],
    },
    {
      eventCode: "INVOICE",
      enabled: true,
      dueDayOfMonth: 15,
      intimations: [
        { id: "invoice-intimation-1", offsetDays: 3 },
        { id: "invoice-intimation-2", offsetDays: 1 },
      ],
      reminders: [
        { id: "invoice-reminder-1", offsetDays: 1 },
        { id: "invoice-reminder-2", offsetDays: 3 },
      ],
    },
  ]),
  reconciliationNegligiblePercent: "2.50",
  opcoInvoiceBankDetailsJson: JSON.stringify({
    accounts: [
      {
        id: "seed-primary",
        label: "Primary settlement",
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
