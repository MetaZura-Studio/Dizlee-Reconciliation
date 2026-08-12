/**
 * Prisma database seed entrypoint (`pnpm db:seed`). Upserts lookups, currencies and rates,
 * app settings, notification templates, OpCos/partners/links, and portal users (shared dev password).
 * Retires legacy demo emails/templates; validates slug uniqueness and link integrity up front.
 */

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { normalizeServiceKey } from "../lib/platform/service-partner-map";
import { APP_SETTINGS_SEED } from "./seed-data/app-settings";
import { CURRENCY_RATE_SEEDS } from "./seed-data/currency-rates";
import { CURRENCY_SEEDS } from "./seed-data/currencies";
import {
  assertUniqueSlugs,
  portalEmail,
  validateSeedLinks,
} from "./seed-data/helpers";
import { LOOKUP_SEEDS } from "./seed-data/lookups";
import { NOTIFICATION_TEMPLATE_SEEDS } from "./seed-data/notification-templates";
import { OPCO_PARTNER_LINK_SEEDS } from "./seed-data/opco-partner-links";
import {
  OPCO_REPORT_MAPPING_SEEDS,
  seedOpcoReportMappingHeadersJson,
} from "./seed-data/opco-report-mappings";
import { OPCO_SEEDS } from "./seed-data/opcos";
import { PARTNER_SEEDS } from "./seed-data/partners";
import { SERVICE_PARTNER_MAP_SEEDS } from "./seed-data/service-partner-maps";

const prisma = new PrismaClient();

/** Shared local dev password for all seed users — see docs/SEED_DATA.md */
const SEED_PASSWORD = "Password123!";

const RETIRED_USER_EMAILS = ["opco@dizlee.com", "partner@dizlee.com"] as const;

const RETIRED_EMAIL_TEMPLATE_CODES = [
  "TEST_EMAIL",
  "NOTIFICATION_EMAIL",
  "PASSWORD_RESET",
  "INVOICE_SENT",
] as const;

async function seedLookups() {
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
}

async function seedCurrencies() {
  const currencyIds = new Map<string, bigint>();

  for (const currency of CURRENCY_SEEDS) {
    const record = await prisma.currency.upsert({
      where: { isoCode: currency.isoCode },
      update: {
        symbol: currency.symbol,
        decimalPrecision: currency.decimalPrecision,
        isDeleted: false,
      },
      create: {
        isoCode: currency.isoCode,
        symbol: currency.symbol,
        decimalPrecision: currency.decimalPrecision,
      },
    });
    currencyIds.set(currency.isoCode, record.id);
  }

  for (const [isoCode, rates] of Object.entries(CURRENCY_RATE_SEEDS)) {
    const currencyId = currencyIds.get(isoCode);
    if (!currencyId) {
      throw new Error(`Missing currency for rate seed: ${isoCode}`);
    }

    for (const rate of rates) {
      await prisma.currencyMonthlyRate.upsert({
        where: {
          currencyId_year_month: {
            currencyId,
            year: rate.year,
            month: rate.month,
          },
        },
        update: {
          rateToUsd: rate.rateToUsd,
          isDeleted: false,
        },
        create: {
          currencyId,
          month: rate.month,
          year: rate.year,
          rateToUsd: rate.rateToUsd,
        },
      });
    }
  }

  return currencyIds;
}

async function seedAppSettings() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: APP_SETTINGS_SEED,
    create: { id: 1, ...APP_SETTINGS_SEED },
  });
}

async function seedNotificationTemplates(activeStatusId: number) {
  for (const template of NOTIFICATION_TEMPLATE_SEEDS) {
    const record = await prisma.notificationTemplate.upsert({
      where: { code: template.code },
      update: {
        name: template.name,
        category: template.category,
        subject: template.subject,
        body: template.body,
        statusId: activeStatusId,
        isDeleted: false,
      },
      create: {
        code: template.code,
        name: template.name,
        category: template.category,
        subject: template.subject,
        body: template.body,
        statusId: activeStatusId,
      },
    });

    for (const version of template.versions) {
      await prisma.emailTemplateVersion.upsert({
        where: {
          notificationTemplateId_version: {
            notificationTemplateId: record.id,
            version: version.version,
          },
        },
        update: {
          subject: version.subject,
          body: version.body,
          changeNote: version.changeNote ?? null,
          isEnabled: true,
        },
        create: {
          notificationTemplateId: record.id,
          version: version.version,
          subject: version.subject,
          body: version.body,
          changeNote: version.changeNote ?? null,
        },
      });
    }
  }

  for (const code of RETIRED_EMAIL_TEMPLATE_CODES) {
    await prisma.notificationTemplate.updateMany({
      where: { code },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}

async function seedOpcosAndPartners(
  activeStatusId: number,
  currencyIds: Map<string, bigint>,
) {
  const opcoIds = new Map<string, bigint>();
  const partnerIds = new Map<string, bigint>();

  for (const opco of OPCO_SEEDS) {
    const defaultCurrencyId = currencyIds.get(opco.defaultCurrencyIso);
    if (!defaultCurrencyId) {
      throw new Error(`Missing currency for OpCo ${opco.slug}: ${opco.defaultCurrencyIso}`);
    }

    const record = await prisma.opco.upsert({
      where: { id: BigInt(opco.id) },
      update: {
        name: opco.name,
        defaultCurrencyId,
        vatPercent: opco.vatPercent ?? 0,
        statusId: activeStatusId,
        isDeleted: false,
      },
      create: {
        id: BigInt(opco.id),
        name: opco.name,
        defaultCurrencyId,
        vatPercent: opco.vatPercent ?? 0,
        statusId: activeStatusId,
      },
    });
    opcoIds.set(opco.slug, record.id);
  }

  for (const partner of PARTNER_SEEDS) {
    const record = await prisma.partner.upsert({
      where: { id: BigInt(partner.id) },
      update: {
        name: partner.name,
        statusId: activeStatusId,
        isDeleted: false,
      },
      create: {
        id: BigInt(partner.id),
        name: partner.name,
        statusId: activeStatusId,
      },
    });
    partnerIds.set(partner.slug, record.id);
  }

  for (const link of OPCO_PARTNER_LINK_SEEDS) {
    const opcoId = opcoIds.get(link.opcoSlug);
    const partnerId = partnerIds.get(link.partnerSlug);
    if (!opcoId || !partnerId) {
      throw new Error(`Invalid link: ${link.opcoSlug} -> ${link.partnerSlug}`);
    }

    await prisma.opcoPartnerLink.upsert({
      where: {
        opcoId_partnerId: { opcoId, partnerId },
      },
      update: { isDeleted: false },
      create: { opcoId, partnerId },
    });
  }

  for (const mapping of OPCO_REPORT_MAPPING_SEEDS) {
    const opcoId = opcoIds.get(mapping.opcoSlug);
    if (!opcoId) {
      throw new Error(`Missing OpCo for report mapping seed: ${mapping.opcoSlug}`);
    }

    await prisma.opcoReportMapping.upsert({
      where: { opcoId },
      update: {
        partnerMode: mapping.partnerMode,
        partnerColumn: mapping.partnerColumn,
        serviceColumn: mapping.serviceColumn,
        revenueColumn: mapping.revenueColumn,
        revenueShareColumn: mapping.revenueShareColumn,
        rowFilterColumn: mapping.rowFilterColumn,
        rowFilterValue: mapping.rowFilterValue,
        aggregateDailyRows: mapping.aggregateDailyRows,
        headersJson: seedOpcoReportMappingHeadersJson(mapping),
        isDeleted: false,
      },
      create: {
        opcoId,
        partnerMode: mapping.partnerMode,
        partnerColumn: mapping.partnerColumn,
        serviceColumn: mapping.serviceColumn,
        revenueColumn: mapping.revenueColumn,
        revenueShareColumn: mapping.revenueShareColumn,
        rowFilterColumn: mapping.rowFilterColumn,
        rowFilterValue: mapping.rowFilterValue,
        aggregateDailyRows: mapping.aggregateDailyRows,
        headersJson: seedOpcoReportMappingHeadersJson(mapping),
      },
    });
  }

  for (const mapping of SERVICE_PARTNER_MAP_SEEDS) {
    const partnerId = partnerIds.get(mapping.partnerSlug);
    if (!partnerId) {
      throw new Error(`Missing Partner for service map seed: ${mapping.partnerSlug}`);
    }
    const serviceKey = normalizeServiceKey(mapping.serviceName);
    await prisma.servicePartnerMap.upsert({
      where: { serviceKey },
      update: {
        serviceName: mapping.serviceName,
        partnerId,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
      },
      create: {
        serviceName: mapping.serviceName,
        serviceKey,
        partnerId,
      },
    });
  }

  return { opcoIds, partnerIds };
}

async function seedUsers(
  activeStatusId: number,
  roleIds: {
    admin: number;
    client: number;
    opco: number;
    partner: number;
  },
  opcoIds: Map<string, bigint>,
  partnerIds: Map<string, bigint>,
) {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const platformUsers = [
    {
      email: "admin@dizlee.com",
      name: "Admin User",
      roleId: roleIds.admin,
      opcoId: null,
      partnerId: null,
    },
    {
      email: "client@dizlee.com",
      name: "Dizlee User",
      roleId: roleIds.client,
      opcoId: null,
      partnerId: null,
    },
  ] as const;

  for (const seedUser of platformUsers) {
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        name: seedUser.name,
        roleId: seedUser.roleId,
        statusId: activeStatusId,
        passwordHash,
        opcoId: seedUser.opcoId,
        partnerId: seedUser.partnerId,
        isDeleted: false,
      },
      create: {
        email: seedUser.email,
        name: seedUser.name,
        roleId: seedUser.roleId,
        statusId: activeStatusId,
        passwordHash,
        opcoId: seedUser.opcoId,
        partnerId: seedUser.partnerId,
      },
    });
  }

  for (const opco of OPCO_SEEDS) {
    const opcoId = opcoIds.get(opco.slug);
    if (!opcoId) {
      throw new Error(`Missing OpCo id for user seed: ${opco.slug}`);
    }

    const email = portalEmail(opco.slug);
    await prisma.user.upsert({
      where: { email },
      update: {
        name: opco.name,
        roleId: roleIds.opco,
        statusId: activeStatusId,
        passwordHash,
        opcoId,
        partnerId: null,
        isDeleted: false,
      },
      create: {
        email,
        name: opco.name,
        roleId: roleIds.opco,
        statusId: activeStatusId,
        passwordHash,
        opcoId,
      },
    });
  }

  for (const partner of PARTNER_SEEDS) {
    const partnerId = partnerIds.get(partner.slug);
    if (!partnerId) {
      throw new Error(`Missing Partner id for user seed: ${partner.slug}`);
    }

    const email = portalEmail(partner.slug);
    await prisma.user.upsert({
      where: { email },
      update: {
        name: partner.name,
        roleId: roleIds.partner,
        statusId: activeStatusId,
        passwordHash,
        opcoId: null,
        partnerId,
        isDeleted: false,
      },
      create: {
        email,
        name: partner.name,
        roleId: roleIds.partner,
        statusId: activeStatusId,
        passwordHash,
        partnerId,
      },
    });
  }

  for (const email of RETIRED_USER_EMAILS) {
    await prisma.user.updateMany({
      where: { email },
      data: { isDeleted: true },
    });
  }

  const keepEmails = new Set<string>([
    ...platformUsers.map((user) => user.email),
    ...OPCO_SEEDS.map((opco) => portalEmail(opco.slug)),
    ...PARTNER_SEEDS.map((partner) => portalEmail(partner.slug)),
  ]);

  const staleUsers = await prisma.user.findMany({
    where: { isDeleted: false },
    select: { id: true, email: true },
  });
  const staleIds = staleUsers
    .filter((user) => !keepEmails.has(user.email))
    .map((user) => user.id);

  if (staleIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: staleIds } },
      data: { isDeleted: true },
    });
  }
}

async function main() {
  assertUniqueSlugs("OpCo", OPCO_SEEDS);
  assertUniqueSlugs("Partner", PARTNER_SEEDS);
  validateSeedLinks(OPCO_SEEDS, PARTNER_SEEDS, OPCO_PARTNER_LINK_SEEDS);

  await seedLookups();

  const activeStatus = await prisma.lookup.findFirst({
    where: { code: "ACTIVE", lookupType: { code: "USER_STATUS" } },
  });
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

  if (!activeStatus || !adminRole || !clientRole || !opcoRole || !partnerRole) {
    throw new Error("Required lookups not found after seeding");
  }

  const currencyIds = await seedCurrencies();
  await seedAppSettings();
  await seedNotificationTemplates(activeStatus.id);

  const { opcoIds, partnerIds } = await seedOpcosAndPartners(
    activeStatus.id,
    currencyIds,
  );

  await seedUsers(
    activeStatus.id,
    {
      admin: adminRole.id,
      client: clientRole.id,
      opco: opcoRole.id,
      partner: partnerRole.id,
    },
    opcoIds,
    partnerIds,
  );

  const [opcoCount, partnerCount, linkCount, userCount] = await Promise.all([
    prisma.opco.count({ where: { isDeleted: false } }),
    prisma.partner.count({ where: { isDeleted: false } }),
    prisma.opcoPartnerLink.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { isDeleted: false } }),
  ]);

  console.log("Seed complete:");
  console.log(`  OpCos: ${opcoCount}`);
  console.log(`  Partners: ${partnerCount}`);
  console.log(`  OpCo–Partner links: ${linkCount}`);
  console.log(`  Users: ${userCount}`);
  console.log(`  Password for all users: ${SEED_PASSWORD}`);
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
