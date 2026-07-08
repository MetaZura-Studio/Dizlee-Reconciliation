import { writeCurrencyAuditLog } from "@/lib/admin/audit";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import {
  createCurrencySchema,
  updateCurrencySchema,
  type CreateCurrencyInput,
  type UpdateCurrencyInput,
} from "@/lib/admin/validation/currencies";
import { prisma } from "@/lib/prisma";

export type { CurrencyListItem } from "@/lib/admin/currencies.shared";

export class CurrencyActionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CurrencyActionError";
    this.status = status;
  }
}

function mapCurrency(row: {
  id: bigint;
  isoCode: string;
  symbol: string | null;
  decimalPrecision: number;
}): CurrencyListItem {
  return {
    id: row.id.toString(),
    isoCode: row.isoCode,
    symbol: row.symbol,
    decimalPrecision: row.decimalPrecision,
  };
}

export async function listCurrencies(): Promise<CurrencyListItem[]> {
  const currencies = await prisma.currency.findMany({
    select: {
      id: true,
      isoCode: true,
      symbol: true,
      decimalPrecision: true,
    },
    orderBy: { isoCode: "asc" },
  });

  return currencies.map(mapCurrency);
}

export async function createCurrency(
  rawInput: CreateCurrencyInput,
  actorUserId: bigint,
): Promise<CurrencyListItem> {
  const parsed = createCurrencySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CurrencyActionError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const existing = await prisma.currency.findFirst({
    where: { isoCode: parsed.data.isoCode },
    select: { id: true },
  });
  if (existing) {
    throw new CurrencyActionError("A currency with this ISO code already exists");
  }

  let created;
  try {
    created = await prisma.currency.create({
      data: {
        isoCode: parsed.data.isoCode,
        symbol: parsed.data.symbol,
        decimalPrecision: parsed.data.decimalPrecision,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      select: {
        id: true,
        isoCode: true,
        symbol: true,
        decimalPrecision: true,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new CurrencyActionError(
        "A currency with this ISO code already exists",
      );
    }
    throw error;
  }

  await writeCurrencyAuditLog({
    actorUserId,
    action: "CURRENCY_CREATED",
    currencyId: created.id,
    message: `Currency ${created.isoCode} created.`,
    metadata: {
      isoCode: created.isoCode,
      symbol: created.symbol,
      decimalPrecision: created.decimalPrecision,
    },
  });

  return mapCurrency(created);
}

export async function updateCurrency(
  currencyIdRaw: string,
  rawInput: UpdateCurrencyInput,
  actorUserId: bigint,
): Promise<CurrencyListItem> {
  const parsed = updateCurrencySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CurrencyActionError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const currencyId = BigInt(currencyIdRaw);
  const existing = await prisma.currency.findFirst({
    where: { id: currencyId },
    select: { id: true, isoCode: true },
  });
  if (!existing) {
    throw new CurrencyActionError("Currency not found", 404);
  }

  const updated = await prisma.currency.update({
    where: { id: currencyId },
    data: {
      symbol: parsed.data.symbol,
      decimalPrecision: parsed.data.decimalPrecision,
      updatedByUserId: actorUserId,
    },
    select: {
      id: true,
      isoCode: true,
      symbol: true,
      decimalPrecision: true,
    },
  });

  await writeCurrencyAuditLog({
    actorUserId,
    action: "CURRENCY_UPDATED",
    currencyId: updated.id,
    message: `Currency ${updated.isoCode} updated.`,
    metadata: {
      symbol: updated.symbol,
      decimalPrecision: updated.decimalPrecision,
    },
  });

  return mapCurrency(updated);
}

export async function deleteCurrency(
  currencyIdRaw: string,
  actorUserId: bigint,
): Promise<void> {
  const currencyId = BigInt(currencyIdRaw);
  const existing = await prisma.currency.findFirst({
    where: { id: currencyId },
    select: { id: true, isoCode: true },
  });
  if (!existing) {
    throw new CurrencyActionError("Currency not found", 404);
  }

  const [opcoCount, reportCount, invoiceCount] = await Promise.all([
    prisma.opco.count({
      where: { defaultCurrencyId: currencyId, isDeleted: false },
    }),
    prisma.report.count({ where: { currencyId, isDeleted: false } }),
    prisma.invoice.count({ where: { currencyId, isDeleted: false } }),
  ]);

  if (opcoCount > 0 || reportCount > 0 || invoiceCount > 0) {
    throw new CurrencyActionError(
      "This currency is in use and cannot be deleted.",
    );
  }

  const now = new Date();
  await prisma.currency.update({
    where: { id: currencyId },
    data: {
      isDeleted: true,
      deletedAt: now,
      deletedByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
  });

  await writeCurrencyAuditLog({
    actorUserId,
    action: "CURRENCY_DELETED",
    currencyId: existing.id,
    message: `Currency ${existing.isoCode} deleted.`,
    metadata: { isoCode: existing.isoCode },
  });
}
