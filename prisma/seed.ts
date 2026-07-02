import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

/** Shared local dev password for all seed users — see docs/AUTH_SESSION.md */
const SEED_PASSWORD = "Password123!";

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

  const adminRole = await prisma.lookup.findFirst({
    where: { code: "ADMIN", lookupType: { code: "USER_ROLE" } },
  });
  const clientRole = await prisma.lookup.findFirst({
    where: { code: "CLIENT", lookupType: { code: "USER_ROLE" } },
  });
  const opcoRole = await prisma.lookup.findFirst({
    where: { code: "OPCO", lookupType: { code: "USER_ROLE" } },
  });
  const partnerRole = await prisma.lookup.findFirst({
    where: { code: "PARTNER", lookupType: { code: "USER_ROLE" } },
  });

  if (!adminRole || !clientRole || !opcoRole || !partnerRole) {
    throw new Error("USER_ROLE lookups not found after seeding");
  }

  const currency = await prisma.currency.upsert({
    where: { isoCode: "USD" },
    update: {},
    create: {
      isoCode: "USD",
      symbol: "$",
      decimalPrecision: 2,
    },
  });

  const opco = await prisma.opco.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      id: BigInt(1),
      name: "Zain Demo OpCo",
      defaultCurrencyId: currency.id,
      statusId: activeStatus.id,
    },
  });

  const partner = await prisma.partner.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      id: BigInt(1),
      name: "Demo Partner",
      statusId: activeStatus.id,
    },
  });

  await prisma.opcoPartnerLink.upsert({
    where: {
      opcoId_partnerId: {
        opcoId: opco.id,
        partnerId: partner.id,
      },
    },
    update: {},
    create: {
      opcoId: opco.id,
      partnerId: partner.id,
    },
  });

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const seedUsers = [
    {
      email: "admin@dizlee.com",
      name: "Admin User",
      roleId: adminRole.id,
      opcoId: null,
      partnerId: null,
    },
    {
      email: "client@dizlee.com",
      name: "Dizlee User",
      roleId: clientRole.id,
      opcoId: null,
      partnerId: null,
    },
    {
      email: "opco@dizlee.com",
      name: "OpCo User",
      roleId: opcoRole.id,
      opcoId: opco.id,
      partnerId: null,
    },
    {
      email: "partner@dizlee.com",
      name: "Partner User",
      roleId: partnerRole.id,
      opcoId: null,
      partnerId: partner.id,
    },
  ] as const;

  for (const seedUser of seedUsers) {
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        name: seedUser.name,
        roleId: seedUser.roleId,
        statusId: activeStatus.id,
        passwordHash,
        opcoId: seedUser.opcoId,
        partnerId: seedUser.partnerId,
        isDeleted: false,
      },
      create: {
        email: seedUser.email,
        name: seedUser.name,
        roleId: seedUser.roleId,
        statusId: activeStatus.id,
        passwordHash,
        opcoId: seedUser.opcoId,
        partnerId: seedUser.partnerId,
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
