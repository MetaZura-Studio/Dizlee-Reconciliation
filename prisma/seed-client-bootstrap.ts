/**
 * Client bootstrap: full org roster, no portal/demo users.
 *
 * Seeds: lookups, currencies, app settings, notification templates,
 * OpCos, Partners, OpCo–Partner links, OpCo report mappings, service partner maps,
 * and a single Admin user (CLIENT_ADMIN_* env).
 *
 * Does NOT create OpCo/Partner/Dizlee portal users — client creates those with real emails.
 *
 * Usage (DATABASE_URL = client DB):
 *
 *   CLIENT_ADMIN_EMAIL=admin@client.com \
 *   CLIENT_ADMIN_PASSWORD='ChooseAStrongPassword!' \
 *   CLIENT_ADMIN_NAME='Client Admin' \
 *   npm run seed:client
 */

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { normalizeServiceKey } from "../lib/platform/service-partner-map";
import { APP_SETTINGS_SEED } from "./seed-data/app-settings";
import { CURRENCY_RATE_SEEDS } from "./seed-data/currency-rates";
import { CURRENCY_SEEDS } from "./seed-data/currencies";
import {
  assertUniqueSlugs,
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
  const clientSettings = {
    ...APP_SETTINGS_SEED,
    emailEnabled: false,
    smtpHost: null as string | null,
    smtpPort: null as number | null,
    senderAddress: null as string | null,
  };

  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {
      ...clientSettings,
      smtpUser: null,
      smtpPasswordEnc: null,
    },
    create: {
      id: 1,
      ...clientSettings,
    },
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
    const opcoId = opcoIds.get(mapping.opcoSlug);
    const partnerId = partnerIds.get(mapping.partnerSlug);
    if (!opcoId) {
      throw new Error(`Missing OpCo for service map seed: ${mapping.opcoSlug}`);
    }
    if (!partnerId) {
      throw new Error(`Missing Partner for service map seed: ${mapping.partnerSlug}`);
    }
    const serviceKey = normalizeServiceKey(mapping.serviceName);
    await prisma.servicePartnerMap.upsert({
      where: { opcoId_serviceKey: { opcoId, serviceKey } },
      update: {
        serviceName: mapping.serviceName,
        partnerId,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
      },
      create: {
        opcoId,
        serviceName: mapping.serviceName,
        serviceKey,
        partnerId,
      },
    });
  }

  return { opcoIds, partnerIds };
}

async function main() {
  const email = process.env.CLIENT_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.CLIENT_ADMIN_PASSWORD;
  const name = process.env.CLIENT_ADMIN_NAME?.trim() || "Admin";

  if (!email || !password) {
    throw new Error(
      "Set CLIENT_ADMIN_EMAIL and CLIENT_ADMIN_PASSWORD before running seed:client",
    );
  }
  if (password.length < 8) {
    throw new Error("CLIENT_ADMIN_PASSWORD must be at least 8 characters");
  }

  assertUniqueSlugs("OpCo", OPCO_SEEDS);
  assertUniqueSlugs("Partner", PARTNER_SEEDS);
  validateSeedLinks(OPCO_SEEDS, PARTNER_SEEDS, OPCO_PARTNER_LINK_SEEDS);

  console.log(
    "Client bootstrap: system data + OpCos/Partners/links/service maps (no portal users)…",
  );
  await seedLookups();

  const activeStatus = await prisma.lookup.findFirst({
    where: { code: "ACTIVE", lookupType: { code: "USER_STATUS" } },
  });
  const adminRole = await prisma.lookup.findFirst({
    where: { code: "ADMIN", lookupType: { code: "USER_ROLE" } },
  });
  if (!activeStatus || !adminRole) {
    throw new Error("Required ADMIN / ACTIVE lookups missing after seedLookups");
  }

  const currencyIds = await seedCurrencies();
  await seedAppSettings();
  await seedNotificationTemplates(activeStatus.id);
  await seedOpcosAndPartners(activeStatus.id, currencyIds);

  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      roleId: adminRole.id,
      statusId: activeStatus.id,
      passwordHash,
      opcoId: null,
      partnerId: null,
      isDeleted: false,
    },
    create: {
      email,
      name,
      roleId: adminRole.id,
      statusId: activeStatus.id,
      passwordHash,
    },
  });

  const [opcoCount, partnerCount, linkCount, mapCount, userCount] =
    await Promise.all([
      prisma.opco.count({ where: { isDeleted: false } }),
      prisma.partner.count({ where: { isDeleted: false } }),
      prisma.opcoPartnerLink.count({ where: { isDeleted: false } }),
      prisma.servicePartnerMap.count({ where: { isDeleted: false } }),
      prisma.user.count({ where: { isDeleted: false } }),
    ]);

  console.log("Client bootstrap complete:");
  console.log(`  OpCos: ${opcoCount}`);
  console.log(`  Partners: ${partnerCount}`);
  console.log(`  OpCo–Partner links: ${linkCount}`);
  console.log(`  Service partner maps: ${mapCount}`);
  console.log(`  Users: ${userCount} (admin only — create more in Admin with real emails)`);
  console.log(`  Admin login: ${email}  →  /admin/login`);
  console.log("  Email/SMTP: configure later in Admin → Email settings");
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
