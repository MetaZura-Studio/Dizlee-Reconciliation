/**
 * TEMPORARY — client testing only. Delete this file after UAT on production.
 *
 * Creates portal users with a known password (no invite email).
 * Run on the server with production DATABASE_URL — do not copy users from local DB.
 *
 * Preset (Dizlee + Zain Kuwait OpCo + samMedia Partner):
 *
 *   SAMPLE_PASSWORD='TestPass1' \
 *   SAMPLE_DIZLEE_EMAIL='you+dizlee@example.com' \
 *   SAMPLE_OPCO_EMAIL='you+kuwait@example.com' \
 *   SAMPLE_PARTNER_EMAIL='you+sammedia@example.com' \
 *   npm run seed:sample-portal-users
 *
 * Single user:
 *
 *   SAMPLE_PASSWORD='TestPass1' \
 *   SAMPLE_EMAIL='you@example.com' \
 *   SAMPLE_ROLE=CLIENT|OPCO|PARTNER \
 *   SAMPLE_NAME='Optional Name' \
 *   SAMPLE_OPCO_NAME='Zain Kuwait' \
 *   SAMPLE_PARTNER_NAME='samMedia' \
 *   npm run seed:sample-portal-users
 *
 * After testing: npm run db:clear-client-scratch  (removes non-Admin users)
 * Then remove this script + package.json entry.
 */

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { passwordSchema } from "../lib/auth/password-policy";

const prisma = new PrismaClient();

type RoleCode = "CLIENT" | "OPCO" | "PARTNER";

type SampleUserSpec = {
  email: string;
  name: string;
  role: RoleCode;
  opcoName?: string;
  partnerName?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function parseRole(raw: string): RoleCode {
  const role = raw.trim().toUpperCase();
  if (role === "CLIENT" || role === "DIZLEE") {
    return "CLIENT";
  }
  if (role === "OPCO") {
    return "OPCO";
  }
  if (role === "PARTNER") {
    return "PARTNER";
  }
  throw new Error(
    `Invalid SAMPLE_ROLE "${raw}". Use CLIENT (Dizlee), OPCO, or PARTNER.`,
  );
}

function buildSpecs(): SampleUserSpec[] {
  const singleEmail = process.env.SAMPLE_EMAIL?.trim();
  if (singleEmail) {
    const role = parseRole(requireEnv("SAMPLE_ROLE"));
    const name =
      process.env.SAMPLE_NAME?.trim() ||
      (role === "CLIENT"
        ? "Sample Dizlee"
        : role === "OPCO"
          ? "Sample OpCo"
          : "Sample Partner");
    return [
      {
        email: normalizeEmail(singleEmail),
        name,
        role,
        opcoName: process.env.SAMPLE_OPCO_NAME?.trim() || "Zain Kuwait",
        partnerName: process.env.SAMPLE_PARTNER_NAME?.trim() || "samMedia",
      },
    ];
  }

  const dizleeEmail = process.env.SAMPLE_DIZLEE_EMAIL?.trim();
  const opcoEmail = process.env.SAMPLE_OPCO_EMAIL?.trim();
  const partnerEmail = process.env.SAMPLE_PARTNER_EMAIL?.trim();

  if (!dizleeEmail || !opcoEmail || !partnerEmail) {
    throw new Error(
      "Set SAMPLE_DIZLEE_EMAIL, SAMPLE_OPCO_EMAIL, and SAMPLE_PARTNER_EMAIL " +
        "(preset), or SAMPLE_EMAIL + SAMPLE_ROLE (single user).",
    );
  }

  const opcoName = process.env.SAMPLE_OPCO_NAME?.trim() || "Zain Kuwait";
  const partnerName = process.env.SAMPLE_PARTNER_NAME?.trim() || "samMedia";

  return [
    {
      email: normalizeEmail(dizleeEmail),
      name: process.env.SAMPLE_DIZLEE_NAME?.trim() || "Sample Dizlee",
      role: "CLIENT",
    },
    {
      email: normalizeEmail(opcoEmail),
      name: process.env.SAMPLE_OPCO_USER_NAME?.trim() || "Sample Zain Kuwait",
      role: "OPCO",
      opcoName,
    },
    {
      email: normalizeEmail(partnerEmail),
      name: process.env.SAMPLE_PARTNER_USER_NAME?.trim() || "Sample samMedia",
      role: "PARTNER",
      partnerName,
    },
  ];
}

async function resolveOrgIds(spec: SampleUserSpec): Promise<{
  opcoId: bigint | null;
  partnerId: bigint | null;
}> {
  if (spec.role === "CLIENT") {
    return { opcoId: null, partnerId: null };
  }

  if (spec.role === "OPCO") {
    const name = spec.opcoName || "Zain Kuwait";
    const opco = await prisma.opco.findFirst({
      where: { name, isDeleted: false },
      select: { id: true },
    });
    if (!opco) {
      throw new Error(`OpCo not found: "${name}". Create it in Admin first.`);
    }
    return { opcoId: opco.id, partnerId: null };
  }

  const name = spec.partnerName || "samMedia";
  const partner = await prisma.partner.findFirst({
    where: { name, isDeleted: false },
    select: { id: true },
  });
  if (!partner) {
    throw new Error(`Partner not found: "${name}". Create it in Admin first.`);
  }
  return { opcoId: null, partnerId: partner.id };
}

async function upsertSampleUser(
  spec: SampleUserSpec,
  passwordHash: string,
  roleId: number,
  statusId: number,
): Promise<void> {
  const { opcoId, partnerId } = await resolveOrgIds(spec);

  await prisma.user.upsert({
    where: { email: spec.email },
    update: {
      name: spec.name,
      roleId,
      statusId,
      passwordHash,
      opcoId,
      partnerId,
      isDeleted: false,
      deletedAt: null,
      deletedByUserId: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
    create: {
      email: spec.email,
      name: spec.name,
      roleId,
      statusId,
      passwordHash,
      opcoId,
      partnerId,
    },
  });

  console.log(
    `  OK  ${spec.role.padEnd(7)}  ${spec.email}  (${spec.name}` +
      (opcoId ? `, OpCo linked` : "") +
      (partnerId ? `, Partner linked` : "") +
      `)`,
  );
}

async function main() {
  console.log(
    "TEMPORARY sample portal users — no invite email. Delete this script after testing.\n",
  );

  const password = requireEnv("SAMPLE_PASSWORD");
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    throw new Error(
      parsedPassword.error.issues[0]?.message ??
        "SAMPLE_PASSWORD does not meet password policy",
    );
  }

  const specs = buildSpecs();
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
      "Missing USER_STATUS/USER_ROLE lookups. Run seed:client or migrate/seed first.",
    );
  }

  const roleIdByCode: Record<RoleCode, number> = {
    CLIENT: clientRole.id,
    OPCO: opcoRole.id,
    PARTNER: partnerRole.id,
  };

  for (const spec of specs) {
    await upsertSampleUser(
      spec,
      passwordHash,
      roleIdByCode[spec.role],
      activeStatus.id,
    );
  }

  console.log("\nDone. Log in at /login with the emails above and SAMPLE_PASSWORD.");
  console.log("After UAT: npm run db:clear-client-scratch  then delete this script.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
