export const APP_SETTINGS_SEED = {
  emailEnabled: false,
  smtpHost: "smtp.example.com",
  smtpPort: 587,
  senderAddress: "noreply@dizlee.com",
  remindersEnabled: true,
  reminderValue: 3,
  reminderUnit: "days",
  reconciliationNegligiblePercent: "2.50",
  opcoInvoiceBankDetailsJson: JSON.stringify(
    {
      bankName: "Dizlee Settlement Bank",
      accountName: "Dizlee Reconciliation Ltd",
      iban: "JO94CBJO0010000000000131000302",
      swift: "CBJOJOAM",
      currency: "USD",
    },
    null,
    2,
  ),
};
