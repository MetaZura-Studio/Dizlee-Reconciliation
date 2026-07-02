import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOOKUP_SEEDS: Record<string, string[]> = {
  USER_ROLE: ["ADMIN", "CLIENT", "OPCO", "PARTNER"],
  USER_STATUS: ["ACTIVE", "INACTIVE", "SUSPENDED"],
  REPORT_STATUS: [
    "PENDING",
    "SUBMITTED",
    "CHANGE_REQUESTED",
    "RESUBMITTED",
    "APPROVED",
  ],
  RECONCILIATION_STATUS: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
  MATCH_STATUS: [
    "MATCHED",
    "MISMATCHED",
    "MISSING_IN_PARTNER",
    "MISSING_IN_OPCO",
  ],
  INVOICE_STATUS: ["DRAFT", "SENT", "ACKNOWLEDGED", "SETTLED"],
  PAYMENT_STATUS: ["UNPAID", "PAID", "OVERDUE"],
  INVOICE_TYPE: ["CLIENT_TO_OPCO", "PARTNER_TO_CLIENT"],
  CONSOLIDATION_STATUS: ["PENDING", "COMPLETED"],
  NOTIFICATION_STATUS: ["DRAFT", "SENT", "SCHEDULED"],
  RECIPIENT_TYPE: ["OPCO", "PARTNER", "USER"],
  AUDIT_ACTION: [
    "USER_CREATED",
    "USER_UPDATED",
    "USER_DELETED",
    "REPORT_UPLOADED",
    "REPORT_CHANGE_REQUESTED",
    "INVOICE_STATUS_UPDATED",
    "INVOICE_PAYMENT_RECORDED",
    "RECONCILIATION_RUN",
    "CONSOLIDATION_GENERATED",
    "SETTINGS_EMAIL_UPDATED",
    "SETTINGS_REMINDERS_UPDATED",
    "SETTINGS_TOLERANCE_UPDATED",
    "SETTINGS_BANK_DETAILS_UPDATED",
    "SETTINGS_OPCO_PARTNER_LINK_UPDATED",
    "EMAIL_TEST_SENT",
    "EMAIL_TEMPLATE_UPDATED",
  ],
  AUDIT_ENTITY_TYPE: [
    "USER",
    "REPORT",
    "INVOICE",
    "RECONCILIATION",
    "CONSOLIDATION",
    "SETTINGS",
    "NOTIFICATION",
  ],
};

const TEMPLATE_SEEDS = [
  {
    code: "PASSWORD_RESET",
    name: "Password Reset",
    subject: "Reset your password",
    body: "Use the link to reset your password.",
  },
  {
    code: "TEST_EMAIL",
    name: "Test Email",
    subject: "Test email from Dizlee",
    body: "This is a test email.",
  },
  {
    code: "NOTIFICATION_EMAIL",
    name: "Notification Email",
    subject: "Notification",
    body: "You have a new notification.",
  },
  {
    code: "INVOICE_SENT",
    name: "Invoice Sent",
    subject: "Invoice sent",
    body: "An invoice has been sent.",
  },
  {
    code: "REPORT_REMINDER",
    name: "Report Reminder",
    subject: "Report submission reminder",
    body: "Please submit your report.",
  },
  {
    code: "INVOICE_REMINDER",
    name: "Invoice Reminder",
    subject: "Invoice submission reminder",
    body: "Please submit your invoice.",
  },
];

async function main() {
  for (const [typeCode, codes] of Object.entries(LOOKUP_SEEDS)) {
    const lookupType = await prisma.lookupType.upsert({
      where: { code: typeCode },
      update: {},
      create: {
        code: typeCode,
        name: typeCode.replaceAll("_", " "),
      },
    });

    for (const [index, code] of codes.entries()) {
      await prisma.lookup.upsert({
        where: {
          lookupTypeId_code: {
            lookupTypeId: lookupType.id,
            code,
          },
        },
        update: {},
        create: {
          lookupTypeId: lookupType.id,
          code,
          label: code.replaceAll("_", " "),
          sortOrder: index,
        },
      });
    }
  }

  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const activeStatus = await prisma.lookup.findFirst({
    where: {
      code: "ACTIVE",
      lookupType: { code: "USER_STATUS" },
    },
  });

  if (!activeStatus) {
    throw new Error("ACTIVE lookup not found after seeding");
  }

  for (const template of TEMPLATE_SEEDS) {
    await prisma.notificationTemplate.upsert({
      where: { code: template.code },
      update: {},
      create: {
        code: template.code,
        name: template.name,
        subject: template.subject,
        body: template.body,
        statusId: activeStatus.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
