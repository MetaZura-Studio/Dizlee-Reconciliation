/**
 * Singleton Prisma client for server-side data access (all portals).
 *
 * Applies a query extension on `findMany` / `findFirst` for configured soft-delete
 * models so routine reads exclude `isDeleted: true` rows. Use explicit filters or
 * raw queries when archived rows are required. Reuses one client instance in
 * non-production to survive Next.js hot reload.
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
  "Consolidation",
  "ConsolidationItem",
  "Reconciliation",
  "ReconciliationItem",
  "Invoice",
  "InvoiceItem",
]);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
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
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma as unknown as PrismaClient;
}

export default prisma;
