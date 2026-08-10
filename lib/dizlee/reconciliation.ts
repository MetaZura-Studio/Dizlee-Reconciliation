/**
 * OpCo–partner lane reconciliation: compare grid, run engine, history, and confirmation.
 * Consumed by reconciliation UI and activity timeline event sources.
 * Uses platform tolerance percent; lane state derives from report presence and last run outcome.
 */

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import { getLookupId } from "@/lib/dizlee/lookups";
import { getLaneNotificationSummaries } from "@/lib/dizlee/lane-report-notifications";
import {
  compareReportLines,
  type CompareLineInput,
} from "@/lib/dizlee/reconciliation/compare";
import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import { getReconciliationTolerancePercent } from "@/lib/platform/reconciliation-tolerance";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export type ReconciliationSearchBy = "opco" | "partner";

export type LaneState =
  | "MISSING"
  | "NO_OPCO_REPORT"
  | "NO_PARTNER_REPORT"
  | "READY"
  | "RECONCILED";

export type CompareLaneStatusFilter = "all" | LaneState;

export type CompareLaneFilters = {
  month: number;
  year: number;
  searchBy: ReconciliationSearchBy;
  entityId?: string;
  search?: string;
  status: CompareLaneStatusFilter;
  sortBy: CompareLaneSortField;
  sortDir: SortDirection;
};

export type CompareLaneSortField = "period" | "opco" | "partner";
export type SortDirection = "asc" | "desc";
export type ReconciliationHistorySortField =
  | "period"
  | "opco"
  | "partner"
  | "runAt";

export type CompareLaneRow = {
  opcoId: string;
  opcoName: string;
  partnerId: string;
  partnerName: string;
  period: DashboardPeriod;
  opcoReportId: string | null;
  partnerReportId: string | null;
  opcoReportFilename: string | null;
  partnerReportFilename: string | null;
  state: LaneState;
  outcome: string | null;
  reconciliationId: string | null;
  canRun: boolean;
  lastOpcoReminderAt: string | null;
  lastPartnerReminderAt: string | null;
  lastOpcoIntimationAt: string | null;
  lastPartnerIntimationAt: string | null;
  notificationCount: number;
};

export type ReconciliationHistoryItem = {
  id: number;
  period: DashboardPeriod;
  lane: string;
  opcoName: string;
  partnerName: string;
  status: string;
  matchedCount: number;
  unmatchedCount: number;
  runAt: string;
  runBy: string;
};

export type ReconciliationHistoryResult = {
  items: ReconciliationHistoryItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  sortBy: ReconciliationHistorySortField;
  sortDir: SortDirection;
};

export type ReconciliationItemView = {
  serviceCode: string;
  description: string | null;
  opcoAmount: number | null;
  partnerAmount: number | null;
  varianceAmount: number | null;
  confirmedValue: number | null;
  matchStatus: string;
};

export type ReconciliationDetail = {
  id: number;
  period: DashboardPeriod;
  opcoId: string;
  partnerId: string;
  opcoName: string;
  partnerName: string;
  opcoReportId: string;
  partnerReportId: string;
  opcoReportFilename: string | null;
  partnerReportFilename: string | null;
  status: string;
  statusCode: string;
  matchedCount: number;
  unmatchedCount: number;
  totalVariance: number | null;
  tolerancePercent: number;
  runAt: string;
  items: ReconciliationItemView[];
  canConfirm: boolean;
};

const HISTORY_PAGE_SIZE = 10;

export class ReconciliationError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ReconciliationError", keyOrMessage, status);
  }
}

function periodFromParts(month: number, year: number): DashboardPeriod {
  return {
    month,
    year,
    label: new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value as never);
}

export function parseCompareLaneFilters(
  searchParams: URLSearchParams,
): CompareLaneFilters {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const searchBy = searchParams.get("searchBy");
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir");
  const status = searchParams.get("status");

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    searchBy: searchBy === "partner" ? "partner" : "opco",
    entityId: searchParams.get("entityId") ?? undefined,
    search: searchParams.get("search")?.trim() || undefined,
    status:
      status === "MISSING" ||
      status === "NO_OPCO_REPORT" ||
      status === "NO_PARTNER_REPORT" ||
      status === "READY" ||
      status === "RECONCILED"
        ? status
        : "all",
    sortBy:
      sortBy === "period" || sortBy === "opco" || sortBy === "partner"
        ? sortBy
        : "opco",
    sortDir: sortDir === "desc" ? "desc" : "asc",
  };
}

export function parseHistoryFilters(searchParams: URLSearchParams): {
  month?: number;
  year?: number;
  page: number;
  search?: string;
  sortBy: ReconciliationHistorySortField;
  sortDir: SortDirection;
} {
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const page = Number(searchParams.get("page"));
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir");

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    search: searchParams.get("search")?.trim() || undefined,
    sortBy:
      sortBy === "period" ||
      sortBy === "opco" ||
      sortBy === "partner" ||
      sortBy === "runAt"
        ? sortBy
        : "runAt",
    sortDir: sortDir === "asc" ? "asc" : "desc",
  };
}

async function getTolerancePercent(): Promise<number> {
  return getReconciliationTolerancePercent();
}

async function writeAuditLog(params: {
  actorUserId: bigint;
  reconciliationId: number;
  message: string;
}): Promise<void> {
  const [actionId, entityTypeId] = await Promise.all([
    getLookupId("AUDIT_ACTION", "RECONCILIATION_RUN"),
    getLookupId("AUDIT_ENTITY_TYPE", "RECONCILIATION"),
  ]);

  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      actionId,
      entityTypeId,
      entityId: BigInt(params.reconciliationId),
      message: params.message,
    },
  });
}

function laneState(params: {
  hasOpcoReport: boolean;
  hasPartnerReport: boolean;
  reconciliationStatusCode: string | null;
}): LaneState {
  if (!params.hasOpcoReport && !params.hasPartnerReport) {
    return "MISSING";
  }
  if (!params.hasOpcoReport) {
    return "NO_OPCO_REPORT";
  }
  if (!params.hasPartnerReport) {
    return "NO_PARTNER_REPORT";
  }
  if (params.reconciliationStatusCode === "COMPLETED") {
    return "RECONCILED";
  }
  return "READY";
}

function outcomeLabel(statusCode: string | null): string | null {
  if (!statusCode) {
    return null;
  }
  return statusCode.replaceAll("_", " ");
}

export async function listCompareLanes(
  filters: CompareLaneFilters,
): Promise<CompareLaneRow[]> {
  const period = periodFromParts(filters.month, filters.year);

  const linkWhere: {
    opcoId?: bigint;
    partnerId?: bigint;
  } = {};

  if (filters.entityId) {
    if (filters.searchBy === "opco") {
      linkWhere.opcoId = BigInt(filters.entityId);
    } else {
      linkWhere.partnerId = BigInt(filters.entityId);
    }
  }

  const [links, reports, reconciliations] = await Promise.all([
    prisma.opcoPartnerLink.findMany({
      where: {
        ...linkWhere,
        ...ACTIVE_OPCO_PARTNER_LINK_FILTER,
        ...(filters.search
          ? {
              OR: [
                { opco: { name: { contains: filters.search } } },
                { partner: { name: { contains: filters.search } } },
              ],
            }
          : {}),
      },
      orderBy: [{ opco: { name: "asc" } }, { partner: { name: "asc" } }],
      include: {
        opco: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
      },
    }),
    prisma.report.findMany({
      where: {
        month: filters.month,
        year: filters.year,
        ...(filters.entityId && filters.searchBy === "opco"
          ? { opcoId: BigInt(filters.entityId) }
          : {}),
        ...(filters.entityId && filters.searchBy === "partner"
          ? { partnerId: BigInt(filters.entityId) }
          : {}),
      },
      include: {
        file: { select: { filename: true } },
        uploadedByUser: { select: { role: { select: { code: true } } } },
      },
    }),
    prisma.reconciliation.findMany({
      where: {
        month: filters.month,
        year: filters.year,
        ...(filters.entityId && filters.searchBy === "opco"
          ? { opcoId: BigInt(filters.entityId) }
          : {}),
        ...(filters.entityId && filters.searchBy === "partner"
          ? { partnerId: BigInt(filters.entityId) }
          : {}),
      },
      include: { status: { select: { code: true } } },
    }),
  ]);

  const reportsByLane = new Map<
    string,
    {
      opco?: (typeof reports)[number];
      partner?: (typeof reports)[number];
    }
  >();

  for (const report of reports) {
    const laneKey = `${report.opcoId.toString()}-${report.partnerId.toString()}`;
    const entry = reportsByLane.get(laneKey) ?? {};
    const role = report.uploadedByUser?.role?.code;

    if (role === "OPCO") {
      entry.opco = report;
    } else if (role === "PARTNER") {
      entry.partner = report;
    }

    reportsByLane.set(laneKey, entry);
  }

  const reconciliationByLane = new Map(
    reconciliations.map((row) => [
      `${row.opcoId.toString()}-${row.partnerId.toString()}`,
      row,
    ]),
  );

  const notificationSummaries = await getLaneNotificationSummaries({
    month: filters.month,
    year: filters.year,
    lanes: links.map((link) => ({
      opcoId: link.opco.id.toString(),
      partnerId: link.partner.id.toString(),
    })),
  });

  const rows = links.map((link) => {
    const laneKey = `${link.opcoId.toString()}-${link.partnerId.toString()}`;
    const laneReports = reportsByLane.get(laneKey);
    const reconciliation = reconciliationByLane.get(laneKey);
    const state = laneState({
      hasOpcoReport: Boolean(laneReports?.opco),
      hasPartnerReport: Boolean(laneReports?.partner),
      reconciliationStatusCode: reconciliation?.status.code ?? null,
    });
    const notificationSummary = notificationSummaries.get(laneKey);

    return {
      opcoId: link.opco.id.toString(),
      opcoName: link.opco.name,
      partnerId: link.partner.id.toString(),
      partnerName: link.partner.name,
      period,
      opcoReportId: laneReports?.opco?.id.toString() ?? null,
      partnerReportId: laneReports?.partner?.id.toString() ?? null,
      opcoReportFilename: laneReports?.opco?.file?.filename ?? null,
      partnerReportFilename: laneReports?.partner?.file?.filename ?? null,
      state,
      outcome: outcomeLabel(reconciliation?.status.code ?? null),
      reconciliationId: reconciliation ? String(reconciliation.id) : null,
      canRun: state === "READY",
      lastOpcoReminderAt: notificationSummary?.lastOpcoReminderAt ?? null,
      lastPartnerReminderAt: notificationSummary?.lastPartnerReminderAt ?? null,
      lastOpcoIntimationAt: notificationSummary?.lastOpcoIntimationAt ?? null,
      lastPartnerIntimationAt: notificationSummary?.lastPartnerIntimationAt ?? null,
      notificationCount: notificationSummary?.totalCount ?? 0,
    };
  });

  const filteredRows =
    filters.status === "all"
      ? rows
      : rows.filter((row) => row.state === filters.status);

  return sortCompareLanes(filteredRows, filters.sortBy, filters.sortDir);
}

function sortCompareLanes(
  rows: CompareLaneRow[],
  sortBy: CompareLaneSortField,
  sortDir: SortDirection,
): CompareLaneRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortBy === "period") {
      const av = a.period.year * 100 + a.period.month;
      const bv = b.period.year * 100 + b.period.month;
      if (av !== bv) {
        return (av - bv) * dir;
      }
    }
    if (sortBy === "partner") {
      const byPartner = a.partnerName.localeCompare(b.partnerName) * dir;
      if (byPartner !== 0) {
        return byPartner;
      }
      return a.opcoName.localeCompare(b.opcoName) * dir;
    }
    const byOpco = a.opcoName.localeCompare(b.opcoName) * dir;
    if (byOpco !== 0) {
      return byOpco;
    }
    return a.partnerName.localeCompare(b.partnerName) * dir;
  });
}

/** Creates or replaces an in-progress reconciliation run for one OpCo–partner lane. */
export async function runReconciliation(params: {
  month: number;
  year: number;
  opcoId: string;
  partnerId: string;
  runByUserId: string;
}): Promise<{ id: number; message: string }> {
  const [opcoReport, partnerReport, tolerancePercent] = await Promise.all([
    prisma.report.findFirst({
      where: {
        opcoId: BigInt(params.opcoId),
        partnerId: BigInt(params.partnerId),
        month: params.month,
        year: params.year,
        uploadedByUser: { role: { code: "OPCO" } },
      },
      include: { lineItems: true },
    }),
    prisma.report.findFirst({
      where: {
        opcoId: BigInt(params.opcoId),
        partnerId: BigInt(params.partnerId),
        month: params.month,
        year: params.year,
        uploadedByUser: { role: { code: "PARTNER" } },
      },
      include: { lineItems: true },
    }),
    getTolerancePercent(),
  ]);

  if (!opcoReport) {
    throw new ReconciliationError("OpCo report not found for this selection.", 404);
  }
  if (!partnerReport) {
    throw new ReconciliationError(
      "Partner report not found for this selection.",
      404,
    );
  }
  if (opcoReport.opcoId !== partnerReport.opcoId) {
    throw new ReconciliationError(
      "Partner and OpCo reports must be for the same OpCo.",
      400,
    );
  }

  const existing = await prisma.reconciliation.findFirst({
    where: {
      opcoId: BigInt(params.opcoId),
      partnerId: BigInt(params.partnerId),
      month: params.month,
      year: params.year,
    },
    include: { status: true },
  });

  if (existing?.status.code === "COMPLETED") {
    throw new ReconciliationError(
      "Lane is already reconciled and cannot be re-run.",
      409,
    );
  }

  const toCompareLine = (line: {
    id: bigint;
    description: string | null;
    lineNumber: number;
    usageUsd: unknown;
    usageAmount: unknown;
    amount: unknown;
  }): CompareLineInput => ({
    lineId: line.id,
    description: line.description,
    lineNumber: line.lineNumber,
    usageUsd: toNumber(line.usageUsd),
    usageAmount: toNumber(line.usageAmount),
    amount: toNumber(line.amount),
  });

  const compared = compareReportLines(
    opcoReport.lineItems.map(toCompareLine),
    partnerReport.lineItems.map(toCompareLine),
    tolerancePercent,
  );

  const matchedCount = compared.filter((row) => row.matchStatus === "MATCHED").length;
  const unmatchedCount = compared.length - matchedCount;
  const totalVariance = compared.reduce(
    (sum, row) => sum + Math.abs(row.varianceAmount ?? 0),
    0,
  );

  const inProgressStatusId = await getLookupId("RECONCILIATION_STATUS", "IN_PROGRESS");
  const matchStatusIds = await Promise.all([
    getLookupId("MATCH_STATUS", "MATCHED"),
    getLookupId("MATCH_STATUS", "MISMATCHED"),
    getLookupId("MATCH_STATUS", "MISSING_IN_PARTNER"),
    getLookupId("MATCH_STATUS", "MISSING_IN_OPCO"),
  ]);
  const matchStatusMap = new Map<string, number>([
    ["MATCHED", matchStatusIds[0]],
    ["MISMATCHED", matchStatusIds[1]],
    ["MISSING_IN_PARTNER", matchStatusIds[2]],
    ["MISSING_IN_OPCO", matchStatusIds[3]],
  ]);

  const runByUserId = BigInt(params.runByUserId);
  const runAt = new Date();

  let reconciliationId: number;

  if (existing) {
    await prisma.reconciliationItem.deleteMany({
      where: { reconciliationId: existing.id },
    });

    const updated = await prisma.reconciliation.update({
      where: { id: existing.id },
      data: {
        opcoReportId: opcoReport.id,
        partnerReportId: partnerReport.id,
        statusId: inProgressStatusId,
        totalVariance,
        matchedCount,
        unmatchedCount,
        runByUserId,
        runAt,
        updatedByUserId: runByUserId,
      },
    });

    reconciliationId = updated.id;
  } else {
    const created = await prisma.reconciliation.create({
      data: {
        opcoId: BigInt(params.opcoId),
        partnerId: BigInt(params.partnerId),
        month: params.month,
        year: params.year,
        opcoReportId: opcoReport.id,
        partnerReportId: partnerReport.id,
        statusId: inProgressStatusId,
        totalVariance,
        matchedCount,
        unmatchedCount,
        runByUserId,
        runAt,
        createdByUserId: runByUserId,
        updatedByUserId: runByUserId,
      },
    });

    reconciliationId = created.id;
  }

  await prisma.reconciliationItem.createMany({
    data: compared.map((row) => ({
      reconciliationId,
      serviceCode: row.serviceCode,
      description: row.description,
      opcoLineItemId: row.opcoLineItemId,
      partnerLineItemId: row.partnerLineItemId,
      opcoAmount: row.opcoAmount,
      partnerAmount: row.partnerAmount,
      varianceAmount: row.varianceAmount,
      confirmedValue: row.confirmedValue,
      matchStatusId: matchStatusMap.get(row.matchStatus)!,
      createdByUserId: runByUserId,
      updatedByUserId: runByUserId,
    })),
  });

  await writeAuditLog({
    actorUserId: runByUserId,
    reconciliationId,
    message:
      unmatchedCount === 0
        ? "Reconciliation saved (fully matched)."
        : "Reconciliation saved (mismatches found).",
  });

  return {
    id: reconciliationId,
    message:
      unmatchedCount === 0
        ? "Reconciliation saved (fully matched)."
        : "Reconciliation saved (mismatches found).",
  };
}

export async function listReconciliationHistory(filters: {
  month?: number;
  year?: number;
  page: number;
  search?: string;
  sortBy: ReconciliationHistorySortField;
  sortDir: SortDirection;
}): Promise<ReconciliationHistoryResult> {
  const where = {
    ...(filters.month ? { month: filters.month } : {}),
    ...(filters.year ? { year: filters.year } : {}),
    ...(filters.search
      ? {
          OR: [
            { opco: { name: { contains: filters.search } } },
            { partner: { name: { contains: filters.search } } },
            { runBy: { name: { contains: filters.search } } },
            { status: { code: { contains: filters.search } } },
          ],
        }
      : {}),
  };

  const orderBy = (() => {
    switch (filters.sortBy) {
      case "period":
        return [{ year: filters.sortDir }, { month: filters.sortDir }, { runAt: "desc" as const }];
      case "opco":
        return { opco: { name: filters.sortDir } };
      case "partner":
        return { partner: { name: filters.sortDir } };
      case "runAt":
      default:
        return { runAt: filters.sortDir };
    }
  })();

  const [totalCount, rows] = await Promise.all([
    prisma.reconciliation.count({ where }),
    prisma.reconciliation.findMany({
      where,
      orderBy,
      skip: (filters.page - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
      include: {
        opco: { select: { name: true } },
        partner: { select: { name: true } },
        status: { select: { code: true } },
        runBy: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / HISTORY_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  return {
    items: rows.map((row) => ({
      id: row.id,
      period: periodFromParts(row.month, row.year),
      lane: `${row.opco.name} / ${row.partner.name}`,
      opcoName: row.opco.name,
      partnerName: row.partner.name,
      status: row.status.code.replaceAll("_", " "),
      matchedCount: row.matchedCount ?? 0,
      unmatchedCount: row.unmatchedCount ?? 0,
      runAt: row.runAt.toISOString(),
      runBy: row.runBy.name ?? "Unknown",
    })),
    page,
    pageSize: HISTORY_PAGE_SIZE,
    totalPages,
    totalCount,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  };
}

export async function getReconciliationDetail(
  id: number,
): Promise<ReconciliationDetail | null> {
  const [reconciliation, tolerancePercent] = await Promise.all([
    prisma.reconciliation.findFirst({
      where: { id },
      include: {
        opco: { select: { name: true } },
        partner: { select: { name: true } },
        opcoReport: { include: { file: { select: { filename: true } } } },
        partnerReport: { include: { file: { select: { filename: true } } } },
        status: { select: { code: true } },
        items: {
          orderBy: { serviceCode: "asc" },
          include: { matchStatus: { select: { code: true } } },
        },
      },
    }),
    getTolerancePercent(),
  ]);

  if (!reconciliation) {
    return null;
  }

  return {
    id: reconciliation.id,
    period: periodFromParts(reconciliation.month, reconciliation.year),
    opcoId: reconciliation.opcoId.toString(),
    partnerId: reconciliation.partnerId.toString(),
    opcoName: reconciliation.opco.name,
    partnerName: reconciliation.partner.name,
    opcoReportId: reconciliation.opcoReportId.toString(),
    partnerReportId: reconciliation.partnerReportId.toString(),
    opcoReportFilename: reconciliation.opcoReport.file?.filename ?? null,
    partnerReportFilename: reconciliation.partnerReport.file?.filename ?? null,
    status: reconciliation.status.code.replaceAll("_", " "),
    statusCode: reconciliation.status.code,
    matchedCount: reconciliation.matchedCount ?? 0,
    unmatchedCount: reconciliation.unmatchedCount ?? 0,
    totalVariance: toNumber(reconciliation.totalVariance),
    tolerancePercent,
    runAt: reconciliation.runAt.toISOString(),
    items: reconciliation.items.map((item) => ({
      serviceCode: item.serviceCode,
      description: item.description,
      opcoAmount: toNumber(item.opcoAmount),
      partnerAmount: toNumber(item.partnerAmount),
      varianceAmount: toNumber(item.varianceAmount),
      confirmedValue: toNumber(item.confirmedValue),
      matchStatus: item.matchStatus.code.replaceAll("_", " "),
    })),
    canConfirm: reconciliation.status.code === "IN_PROGRESS",
  };
}

/** Marks a reconciliation complete after operator review; no-op when not IN_PROGRESS. */
export async function confirmReconciliation(
  id: number,
  userId: string,
): Promise<void> {
  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id },
    include: { status: true },
  });

  if (!reconciliation) {
    throw new ReconciliationError("Reconciliation not found.", 404);
  }

  if (reconciliation.status.code === "COMPLETED") {
    throw new ReconciliationError(
      "Reconciliation is already CONFIRMED and cannot be reverted to DRAFT.",
      409,
    );
  }

  if (reconciliation.status.code !== "IN_PROGRESS") {
    throw new ReconciliationError(
      "Only in-progress reconciliations can be confirmed.",
      400,
    );
  }

  const completedStatusId = await getLookupId("RECONCILIATION_STATUS", "COMPLETED");
  const actorUserId = BigInt(userId);

  await prisma.reconciliation.update({
    where: { id },
    data: {
      statusId: completedStatusId,
      updatedByUserId: actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId,
    reconciliationId: id,
    message: "Reconciliation confirmed.",
  });
}

export { getTolerancePercent };
