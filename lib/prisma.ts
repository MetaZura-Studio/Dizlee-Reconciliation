/**
 * Singleton Prisma client for server-side data access (all portals).
 *
 * Applies a query extension on `findMany` / `findFirst` for configured soft-delete
 * models so routine reads exclude `isDeleted: true` rows. Use explicit filters or
 * raw queries when archived rows are required. Reuses one client instance in
 * non-production to survive Next.js hot reload.
 *
 * Access goes through a Proxy so a stale hot-reload client (missing newer models
 * after `prisma generate`) is replaced on next use instead of staying broken.
 */

import { PrismaClient } from "@prisma/client";

const SOFT_DELETE_MODELS = new Set([
  "LookupType",
  "Lookup",
  "Currency",
  "Opco",
  "Partner",
  "ServicePartnerMap",
  "OpcoReportMapping",
  "User",
  "CurrencyMonthlyRate",
  "OpcoPartnerLink",
  "File",
  "Notification",
  "NotificationRecipient",
  "NotificationAttachment",
  "NotificationTemplate",
  "Report",
  "ReportLineItem",
  "OpcoReportSubmission",
  "Consolidation",
  "ConsolidationItem",
  "Reconciliation",
  "ReconciliationItem",
  "Invoice",
  "InvoiceItem",
  "RevenueShareReport",
]);

/** Bump when adding Prisma models so stale Turbopack/global clients are dropped. */
const PRISMA_CLIENT_GENERATION = 4;

type CachedPrisma = {
  generation: number;
  client: PrismaClient;
};

const globalForPrisma = globalThis as unknown as {
  __dizleePrisma?: CachedPrisma;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { ...args.where, isDeleted: false };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { ...args.where, isDeleted: false };
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

function hasRequiredDelegates(client: PrismaClient): boolean {
  const c = client as unknown as {
    opcoReportSubmission?: { findMany?: unknown };
    cronJobRun?: { findMany?: unknown };
    authRateLimitBucket?: { findUnique?: unknown };
  };
  return (
    typeof c.opcoReportSubmission?.findMany === "function" &&
    typeof c.cronJobRun?.findMany === "function" &&
    typeof c.authRateLimitBucket?.findUnique === "function"
  );
}

function resolvePrismaClient(): PrismaClient {
  const cached = globalForPrisma.__dizleePrisma;
  if (
    cached &&
    cached.generation === PRISMA_CLIENT_GENERATION &&
    hasRequiredDelegates(cached.client)
  ) {
    return cached.client;
  }

  if (cached) {
    void cached.client.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  if (!hasRequiredDelegates(client)) {
    throw new Error(
      "Prisma client is missing OpcoReportSubmission. Run `npx prisma generate` and restart the Next.js dev server.",
    );
  }

  globalForPrisma.__dizleePrisma = {
    generation: PRISMA_CLIENT_GENERATION,
    client,
  };
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = resolvePrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
