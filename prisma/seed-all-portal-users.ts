/**
 * TEMPORARY — client testing only. Delete after real portal users replace these.
 *
 * Creates Dizlee + one portal user per OpCo/Partner already in the DB, using the
 * same emails as local demo seed (`{slug}@dizlee.com`). Does NOT create orgs,
 * does NOT run full `npm run seed`, does NOT send invite emails.
 *
 * Run on the production server (with production DATABASE_URL):
 *
 *   SAMPLE_PASSWORD='Password123!' npm run seed:all-portal-users
 *
 * Password must meet policy (8+, upper, lower, number). Default if unset: Password123!
 *
 * After go-live: npm run db:clear-client-scratch  then create real users in Admin.
 */

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { passwordSchema } from "../lib/auth/password-policy";
import { portalEmail } from "./seed-data/helpers";
import { OPCO_SEEDS } from "./seed-data/opcos";
import { PARTNER_SEEDS } from "./seed-data/partners";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Password123!";
const DIZLEE_EMAIL = "client@dizlee.com";
const DIZLEE_NAME = "Sample Dizlee";

async function main() {
  console.log(
    "TEMPORARY: seed all roster portal users (Dizlee + OpCos + Partners). No invite email.\n",
  );

  const password = process.env.SAMPLE_PASSWORD?.trim() || DEFAULT_PASSWORD;
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    throw new Error(
      parsedPassword.error.issues[0]?.message ??
        "SAMPLE_PASSWORD does not meet password policy",
    );
  }

  const passwordHash = await hashPassword(password);

  const [activeStatus, clientRole, opcoRole, partnerRole] = await Promise.all([
    prisma.lookup.findFirst({
      where: { code: "ACTIVE", lookupType: { code: "USER_STATUS" } },
    }),
    prisma.lookup.findFirst({
      where: { code: "CLIENT", lookupType: { code: "USER_ROLE" } },
    }),
    prisma.lookup.findFirst({
      where: { code: "OPCO", lookupType: { code: "USER_ROLE" } },
    }),
    prisma.lookup.findFirst({
      where: { code: "PARTNER", lookupType: { code: "USER_ROLE" } },
    }),
  ]);

  if (!activeStatus || !clientRole || !opcoRole || !partnerRole) {
    throw new Error(
      "Missing USER_STATUS/USER_ROLE lookups. Run seed:client first.",
    );
  }

  let createdOrUpdated = 0;
  let skippedMissingOrg = 0;

  await prisma.user.upsert({
    where: { email: DIZLEE_EMAIL },
    update: {
      name: DIZLEE_NAME,
      roleId: clientRole.id,
      statusId: activeStatus.id,
      passwordHash,
      opcoId: null,
      partnerId: null,
      isDeleted: false,
      deletedAt: null,
      deletedByUserId: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
    create: {
      email: DIZLEE_EMAIL,
      name: DIZLEE_NAME,
      roleId: clientRole.id,
      statusId: activeStatus.id,
      passwordHash,
    },
  });
  createdOrUpdated += 1;
  console.log(`  OK  CLIENT   ${DIZLEE_EMAIL}`);

  for (const opco of OPCO_SEEDS) {
    const org = await prisma.opco.findFirst({
      where: { name: opco.name, isDeleted: false },
      select: { id: true },
    });
    if (!org) {
      skippedMissingOrg += 1;
      console.log(`  SKIP OPCO    ${opco.name} (not in DB)`);
      continue;
    }

    const email = portalEmail(opco.slug);
    await prisma.user.upsert({
      where: { email },
      update: {
        name: opco.name,
        roleId: opcoRole.id,
        statusId: activeStatus.id,
        passwordHash,
        opcoId: org.id,
        partnerId: null,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
      create: {
        email,
        name: opco.name,
        roleId: opcoRole.id,
        statusId: activeStatus.id,
        passwordHash,
        opcoId: org.id,
      },
    });
    createdOrUpdated += 1;
    console.log(`  OK  OPCO     ${email}  →  ${opco.name}`);
  }

  for (const partner of PARTNER_SEEDS) {
    const org = await prisma.partner.findFirst({
      where: { name: partner.name, isDeleted: false },
      select: { id: true },
    });
    if (!org) {
      skippedMissingOrg += 1;
      console.log(`  SKIP PARTNER ${partner.name} (not in DB)`);
      continue;
    }

    const email = portalEmail(partner.slug);
    await prisma.user.upsert({
      where: { email },
      update: {
        name: partner.name,
        roleId: partnerRole.id,
        statusId: activeStatus.id,
        passwordHash,
        opcoId: null,
        partnerId: org.id,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
      create: {
        email,
        name: partner.name,
        roleId: partnerRole.id,
        statusId: activeStatus.id,
        passwordHash,
        partnerId: org.id,
      },
    });
    createdOrUpdated += 1;
    console.log(`  OK  PARTNER  ${email}  →  ${partner.name}`);
  }

  console.log(
    `\nDone. Upserted ${createdOrUpdated} users. Skipped ${skippedMissingOrg} missing orgs.`,
  );
  console.log(`Password for all: ${password}`);
  console.log("Log in at /login (same emails as local seed, e.g. zain-ksa@dizlee.com).");
  console.log(
    "After go-live: db:clear-client-scratch, then create real users in Admin.",
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
