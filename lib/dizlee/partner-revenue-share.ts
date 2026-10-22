/**
 * Dizlee → Partner Revenue Share report: build from completed reconciliation,
 * preview/send with Partner notification, list, and 3-month retention purge.
 */

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import { sendBroadcastNotification } from "@/lib/dizlee/notifications/intimations";
import { normalizeServiceName } from "@/lib/dizlee/reconciliation/compare";
import { DomainError } from "@/lib/errors/app-error";
import {
  formatAppDate,
  formatAppMonthYear,
} from "@/lib/platform/format-datetime";
import { getOpcoReportFx } from "@/lib/platform/report-fx";
import {
  matchServiceMapRow,
  normalizeServiceKey,
} from "@/lib/platform/service-partner-map";
import { prisma } from "@/lib/prisma";
import type { Decimal } from "@prisma/client/runtime/library";

import {
  DEFAULT_PARTNER_RS_RETENTION_OPTIONS,
  PARTNER_RS_RETENTION_5_PERCENT,
  PARTNER_RS_RETENTION_10_PERCENT,
  type PartnerRsRetentionOptions,
} from "@/lib/dizlee/partner-revenue-share.shared";

export {
  DEFAULT_PARTNER_RS_RETENTION_OPTIONS,
  parsePartnerRsRetentionOptions,
  PARTNER_RS_RETENTION_5_PERCENT,
  PARTNER_RS_RETENTION_10_PERCENT,
  type PartnerRsRetentionOptions,
} from "@/lib/dizlee/partner-revenue-share.shared";

export const PARTNER_RS_REPORT_TEMPLATE_CODE = "PARTNER_RS_REPORT";
export const PARTNER_RS_RETENTION_MONTHS = 3;
/** Fixed regulatory fee on Partner RS PDF for Zain Iraq only. */
export const IRAQ_PARTNER_RS_REGULATORY_FEE_PERCENT = 19.5;
export const IRAQ_PARTNER_RS_OPCO_NAME = "Zain Iraq";

export type PartnerRsLine = {
  serviceName: string;
  grossRevenueLc: number;
  regulatoryFeePercent: number;
  regulatoryFeeAmountLc: number;
  partnerRsPercent: number;
  partnerRsAmountLc: number;
};

export type PartnerRsReport = {
  reconciliationId: number;
  opcoId: string;
  opcoName: string;
  partnerId: string;
  partnerName: string;
  period: DashboardPeriod;
  currencyCode: string;
  /** Local currency units per 1 USD (template exchange rate). */
  exchangeRateLocalPerUsd: number;
  lines: PartnerRsLine[];
  totalGrossLc: number;
  totalRsLc: number;
  totalRsUsd: number;
  retention5Usd: number;
  retention10Usd: number;
  includeRetention5: boolean;
  includeRetention10: boolean;
  /** When true, PDF shows Regulatory Fee % column (Iraq). */
  showRegulatoryFeeColumn: boolean;
  netAmountUsd: number;
  generatedOnLabel: string;
};

export type PartnerRsListItem = {
  id: number;
  opcoId: string;
  opcoName: string;
  partnerId: string;
  partnerName: string;
  month: number;
  year: number;
  periodLabel: string;
  sentAt: string;
  sentAtLabel: string;
  filename: string;
  reconciliationId: number | null;
};

export class PartnerRevenueShareError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("PartnerRevenueShareError", keyOrMessage, status);
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const raw =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/%/g, "").trim());
  return Number.isFinite(raw) ? raw : null;
}

function decimalToNumber(value: Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseFloat(typeof value === "string" ? value : value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function periodFromParts(month: number, year: number): DashboardPeriod {
  return {
    month,
    year,
    label: formatAppMonthYear(month, year),
  };
}

function parseSourceRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function serviceNameFromLine(item: {
  description: string | null;
  sourceColumns: unknown;
}): string {
  const source = parseSourceRecord(item.sourceColumns);
  return (
    item.description?.trim() ||
    String(source.service_name ?? source.servicename ?? "").trim() ||
    "—"
  );
}

/** Partner RS amount = Gross LC × Partner RS% / 100. */
export function partnerRsAmountFromGross(
  grossLc: number,
  partnerRsPercent: number,
): number {
  return (grossLc * partnerRsPercent) / 100;
}

export function partnerRsRegulatoryFeeAmount(
  grossLc: number,
  regulatoryFeePercent: number,
): number {
  if (!Number.isFinite(regulatoryFeePercent) || regulatoryFeePercent <= 0) {
    return 0;
  }
  return (grossLc * regulatoryFeePercent) / 100;
}

/** True when Partner RS PDF should apply Iraq's fixed regulatory fee. */
export function isIraqPartnerRsOpco(opcoName: string): boolean {
  return opcoName.trim().toLowerCase() === IRAQ_PARTNER_RS_OPCO_NAME.toLowerCase();
}

/** USD = LC / (local units per 1 USD). */
export function partnerRsUsdFromLc(
  totalRsLc: number,
  localPerUsd: number,
): number {
  if (!Number.isFinite(localPerUsd) || localPerUsd <= 0) {
    return 0;
  }
  return totalRsLc / localPerUsd;
}

export function partnerRsRetentionAmount(
  totalRsUsd: number,
  retentionPercent: number,
): number {
  return (totalRsUsd * retentionPercent) / 100;
}

export function partnerRsNetAmountUsd(
  totalRsUsd: number,
  options: PartnerRsRetentionOptions = DEFAULT_PARTNER_RS_RETENTION_OPTIONS,
): number {
  let net = totalRsUsd;
  if (options.includeRetention5) {
    net -= partnerRsRetentionAmount(
      totalRsUsd,
      PARTNER_RS_RETENTION_5_PERCENT,
    );
  }
  if (options.includeRetention10) {
    net -= partnerRsRetentionAmount(
      totalRsUsd,
      PARTNER_RS_RETENTION_10_PERCENT,
    );
  }
  return net;
}

/** Send / preview only when reconciliation is COMPLETED. */
export function canSendPartnerRsReport(statusCode: string): boolean {
  return statusCode === "COMPLETED";
}

/** Period older than (currentMonth − retentionMonths) is purgeable. */
export function isPartnerRsPeriodExpired(
  period: { month: number; year: number },
  now: Date,
  retentionMonths: number = PARTNER_RS_RETENTION_MONTHS,
): boolean {
  const cutoff = partnerRsRetentionCutoff(now, retentionMonths);
  if (period.year < cutoff.year) {
    return true;
  }
  if (period.year > cutoff.year) {
    return false;
  }
  return period.month < cutoff.month;
}

export function partnerRsRetentionCutoff(
  now: Date,
  retentionMonths: number = PARTNER_RS_RETENTION_MONTHS,
): { month: number; year: number } {
  const totalMonths = now.getUTCFullYear() * 12 + (now.getUTCMonth() + 1) - retentionMonths;
  const year = Math.floor((totalMonths - 1) / 12);
  const month = ((totalMonths - 1) % 12) + 1;
  return { month, year };
}

export function resolvePartnerRsPercentForService(params: {
  serviceName: string;
  partnerId: bigint;
  maps: Array<{
    serviceKey: string;
    serviceName?: string | null;
    partnerId: bigint;
    partnerRsPercent: number;
  }>;
}): number {
  const matched = matchServiceMapRow(
    {
      serviceKey: normalizeServiceKey(params.serviceName),
      serviceName: params.serviceName,
    },
    params.maps,
  );
  if (!matched || matched.partnerId !== params.partnerId) {
    return 0;
  }
  return matched.partnerRsPercent;
}

export function buildPartnerRsLines(params: {
  lineItems: Array<{
    description: string | null;
    amount: unknown;
    sourceColumns: unknown;
  }>;
  partnerId: bigint;
  maps: Array<{
    serviceKey: string;
    serviceName?: string | null;
    partnerId: bigint;
    partnerRsPercent: number;
  }>;
  /** 0 = no fee (default); 19.5 for Zain Iraq Partner RS PDF. */
  regulatoryFeePercent?: number;
}): PartnerRsLine[] {
  const regulatoryFeePercent =
    params.regulatoryFeePercent != null &&
    Number.isFinite(params.regulatoryFeePercent) &&
    params.regulatoryFeePercent > 0
      ? params.regulatoryFeePercent
      : 0;
  const byService = new Map<string, { serviceName: string; grossLc: number }>();

  params.lineItems.forEach((item, index) => {
    const serviceName = serviceNameFromLine(item);
    const key = normalizeServiceName(serviceName, index + 1);
    const amount = toFiniteNumber(item.amount) ?? 0;
    const existing = byService.get(key);
    if (existing) {
      existing.grossLc += amount;
      return;
    }
    byService.set(key, { serviceName, grossLc: amount });
  });

  return [...byService.values()]
    .sort((a, b) => a.serviceName.localeCompare(b.serviceName))
    .map((row) => {
      const partnerRsPercent = resolvePartnerRsPercentForService({
        serviceName: row.serviceName,
        partnerId: params.partnerId,
        maps: params.maps,
      });
      const regulatoryFeeAmountLc = partnerRsRegulatoryFeeAmount(
        row.grossLc,
        regulatoryFeePercent,
      );
      const netLc = row.grossLc - regulatoryFeeAmountLc;
      return {
        serviceName: row.serviceName,
        grossRevenueLc: row.grossLc,
        regulatoryFeePercent,
        regulatoryFeeAmountLc,
        partnerRsPercent,
        partnerRsAmountLc: partnerRsAmountFromGross(netLc, partnerRsPercent),
      };
    });
}

export async function buildPartnerRsReportForReconciliation(
  reconciliationId: number,
  retentionOptions: PartnerRsRetentionOptions = DEFAULT_PARTNER_RS_RETENTION_OPTIONS,
): Promise<PartnerRsReport> {
  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id: reconciliationId, isDeleted: false },
    include: {
      opco: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
      status: { select: { code: true } },
      opcoReport: {
        select: {
          id: true,
          partnerId: true,
          lineItems: {
            where: { isDeleted: false },
            select: {
              description: true,
              amount: true,
              sourceColumns: true,
            },
          },
        },
      },
    },
  });

  if (!reconciliation) {
    throw new PartnerRevenueShareError("Reconciliation not found.", 404);
  }
  if (!canSendPartnerRsReport(reconciliation.status.code)) {
    throw new PartnerRevenueShareError(
      "Partner Revenue Share report can only be sent after reconciliation is completed.",
      400,
    );
  }

  const [fx, maps] = await Promise.all([
    getOpcoReportFx({
      opcoId: reconciliation.opcoId,
      month: reconciliation.month,
      year: reconciliation.year,
    }),
    prisma.servicePartnerMap.findMany({
      where: { opcoId: reconciliation.opcoId, isDeleted: false },
      select: {
        serviceKey: true,
        serviceName: true,
        partnerId: true,
        partnerRsPercent: true,
      },
    }),
  ]);

  if (fx.rateToUsd === null || !Number.isFinite(fx.rateToUsd) || fx.rateToUsd <= 0) {
    throw new PartnerRevenueShareError(
      `No USD rate for ${fx.currencyCode} in this period. Set it in Admin Currencies before sending the Partner RS report.`,
      400,
    );
  }

  const localPerUsd = 1 / fx.rateToUsd;
  const mapRows = maps.map((row) => ({
    serviceKey: row.serviceKey,
    serviceName: row.serviceName,
    partnerId: row.partnerId,
    partnerRsPercent: decimalToNumber(row.partnerRsPercent),
  }));

  const showRegulatoryFeeColumn = isIraqPartnerRsOpco(reconciliation.opco.name);
  const lines = buildPartnerRsLines({
    lineItems: reconciliation.opcoReport.lineItems,
    partnerId: reconciliation.partnerId,
    maps: mapRows,
    regulatoryFeePercent: showRegulatoryFeeColumn
      ? IRAQ_PARTNER_RS_REGULATORY_FEE_PERCENT
      : 0,
  });

  if (lines.length === 0) {
    throw new PartnerRevenueShareError(
      "No OpCo report lines found for this Partner. Cannot build the Partner RS report.",
      400,
    );
  }

  const totalGrossLc = lines.reduce((sum, line) => sum + line.grossRevenueLc, 0);
  const totalRsLc = lines.reduce((sum, line) => sum + line.partnerRsAmountLc, 0);
  const totalRsUsd = partnerRsUsdFromLc(totalRsLc, localPerUsd);
  const retention5Usd = retentionOptions.includeRetention5
    ? partnerRsRetentionAmount(totalRsUsd, PARTNER_RS_RETENTION_5_PERCENT)
    : 0;
  const retention10Usd = retentionOptions.includeRetention10
    ? partnerRsRetentionAmount(totalRsUsd, PARTNER_RS_RETENTION_10_PERCENT)
    : 0;

  return {
    reconciliationId: reconciliation.id,
    opcoId: reconciliation.opco.id.toString(),
    opcoName: reconciliation.opco.name,
    partnerId: reconciliation.partner.id.toString(),
    partnerName: reconciliation.partner.name,
    period: periodFromParts(reconciliation.month, reconciliation.year),
    currencyCode: fx.currencyCode,
    exchangeRateLocalPerUsd: localPerUsd,
    lines,
    totalGrossLc,
    totalRsLc,
    totalRsUsd,
    retention5Usd,
    retention10Usd,
    includeRetention5: retentionOptions.includeRetention5,
    includeRetention10: retentionOptions.includeRetention10,
    showRegulatoryFeeColumn,
    netAmountUsd: partnerRsNetAmountUsd(totalRsUsd, retentionOptions),
    generatedOnLabel: formatAppDate(new Date()),
  };
}

export async function previewPartnerRsReport(
  reconciliationId: number,
  retentionOptions: PartnerRsRetentionOptions = DEFAULT_PARTNER_RS_RETENTION_OPTIONS,
): Promise<{
  report: PartnerRsReport;
  buffer: Buffer;
  filename: string;
  mimeType: string;
}> {
  const report = await buildPartnerRsReportForReconciliation(
    reconciliationId,
    retentionOptions,
  );
  const { buildPartnerRevenueSharePdf, partnerRevenueShareExportFilename } =
    await import("@/lib/dizlee/partner-revenue-share/export-pdf");
  const buffer = await buildPartnerRevenueSharePdf(report);
  return {
    report,
    buffer,
    filename: partnerRevenueShareExportFilename(
      report.partnerName,
      report.opcoName,
      report.period.month,
      report.period.year,
    ),
    mimeType: "application/pdf",
  };
}

export async function sendPartnerRsReport(params: {
  reconciliationId: number;
  actorUserId: string;
  retentionOptions?: PartnerRsRetentionOptions;
}): Promise<{
  reportId: number;
  notificationId: string;
  message: string;
  filename: string;
}> {
  const preview = await previewPartnerRsReport(
    params.reconciliationId,
    params.retentionOptions ?? DEFAULT_PARTNER_RS_RETENTION_OPTIONS,
  );
  const { report, buffer, filename, mimeType } = preview;
  const actorUserId = BigInt(params.actorUserId);
  const opcoId = BigInt(report.opcoId);
  const partnerId = BigInt(report.partnerId);

  // notifications/ folder — required by broadcast attachment allowlist.
  const { createNotificationAttachmentFile } = await import(
    "@/lib/platform/notification-attachments"
  );
  const attachment = await createNotificationAttachmentFile({
    buffer,
    filename,
    mimeType,
    userId: actorUserId,
  });
  const fileId = BigInt(attachment.fileId);

  const notify = await sendBroadcastNotification({
    input: {
      audience: "partner",
      opcoIds: [],
      partnerIds: [report.partnerId],
      messageSource: PARTNER_RS_REPORT_TEMPLATE_CODE,
      month: report.period.month,
      year: report.period.year,
      attachmentFileIds: [attachment.fileId],
      deliveryChannel: "BOTH",
      requireEmailConfigured: false,
      priority: "NORMAL",
    },
    fromUserId: params.actorUserId,
  });

  const sentAt = new Date();
  const existing = await prisma.partnerRevenueShareReport.findFirst({
    where: {
      opcoId,
      partnerId,
      month: report.period.month,
      year: report.period.year,
    },
  });

  const row = existing
    ? await prisma.partnerRevenueShareReport.update({
        where: { id: existing.id },
        data: {
          fileId,
          reconciliationId: report.reconciliationId,
          sentAt,
          sentByUserId: actorUserId,
          notificationId: BigInt(notify.id),
          updatedByUserId: actorUserId,
          isDeleted: false,
          deletedAt: null,
          deletedByUserId: null,
        },
      })
    : await prisma.partnerRevenueShareReport.create({
        data: {
          opcoId,
          partnerId,
          month: report.period.month,
          year: report.period.year,
          fileId,
          reconciliationId: report.reconciliationId,
          sentAt,
          sentByUserId: actorUserId,
          notificationId: BigInt(notify.id),
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
      });

  await prisma.partnerRevenueShareReportItem.deleteMany({
    where: { partnerRevenueShareReportId: row.id },
  });
  if (report.lines.length > 0) {
    await prisma.partnerRevenueShareReportItem.createMany({
      data: report.lines.map((line, index) => ({
        partnerRevenueShareReportId: row.id,
        serviceName: line.serviceName,
        grossRevenueLc: line.grossRevenueLc,
        partnerRsPercent: line.partnerRsPercent,
        partnerRsAmountLc: line.partnerRsAmountLc,
        sortOrder: index,
      })),
    });
  }

  return {
    reportId: row.id,
    notificationId: notify.id,
    message: "Partner Revenue Share report sent successfully.",
    filename,
  };
}

export function parsePartnerRsListFilters(searchParams: URLSearchParams): {
  month: number;
  year: number;
} {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month") ?? fallback.month);
  const year = Number(searchParams.get("year") ?? fallback.year);
  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12
        ? month
        : fallback.month,
    year: Number.isInteger(year) && year >= 2000 ? year : fallback.year,
  };
}

function mapPartnerRsListRow(row: {
  id: number;
  month: number;
  year: number;
  sentAt: Date;
  reconciliationId: number | null;
  opco: { id: bigint; name: string };
  partner: { id: bigint; name: string };
  file: { filename: string };
}): PartnerRsListItem {
  return {
    id: row.id,
    opcoId: row.opco.id.toString(),
    opcoName: row.opco.name,
    partnerId: row.partner.id.toString(),
    partnerName: row.partner.name,
    month: row.month,
    year: row.year,
    periodLabel: formatAppMonthYear(row.month, row.year),
    sentAt: row.sentAt.toISOString(),
    sentAtLabel: formatAppDate(row.sentAt),
    filename: row.file.filename,
    reconciliationId: row.reconciliationId,
  };
}

export async function listPartnerRevenueShareReports(params: {
  month: number;
  year: number;
  partnerId?: string;
}): Promise<{
  period: DashboardPeriod;
  items: PartnerRsListItem[];
}> {
  const rows = await prisma.partnerRevenueShareReport.findMany({
    where: {
      month: params.month,
      year: params.year,
      isDeleted: false,
      ...(params.partnerId
        ? { partnerId: BigInt(params.partnerId) }
        : {}),
    },
    orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    include: {
      opco: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
      file: { select: { filename: true } },
    },
  });

  return {
    period: periodFromParts(params.month, params.year),
    items: rows.map(mapPartnerRsListRow),
  };
}

export async function getPersistedPartnerRevenueShareReport(
  id: number,
  options?: { partnerId?: string },
): Promise<{
  id: number;
  file: {
    id: bigint;
    filename: string;
    storageKey: string;
    mimeType: string | null;
  };
} | null> {
  const row = await prisma.partnerRevenueShareReport.findFirst({
    where: {
      id,
      isDeleted: false,
      ...(options?.partnerId
        ? { partnerId: BigInt(options.partnerId) }
        : {}),
    },
    select: {
      id: true,
      file: {
        select: {
          id: true,
          filename: true,
          storageKey: true,
          mimeType: true,
        },
      },
    },
  });
  if (!row) {
    return null;
  }
  return { id: row.id, file: row.file };
}

/**
 * Soft-delete Partner RS reports (and mark files deleted) whose period is
 * older than current month − retention months.
 */
export async function purgeExpiredPartnerRevenueShareReports(
  now: Date = new Date(),
): Promise<{ purged: number }> {
  const cutoff = partnerRsRetentionCutoff(now);
  const expired = await prisma.partnerRevenueShareReport.findMany({
    where: {
      isDeleted: false,
      OR: [
        { year: { lt: cutoff.year } },
        { year: cutoff.year, month: { lt: cutoff.month } },
      ],
    },
    select: { id: true, fileId: true },
  });

  if (expired.length === 0) {
    return { purged: 0 };
  }

  const ids = expired.map((row) => row.id);
  const fileIds = expired.map((row) => row.fileId);
  const deletedAt = now;

  await prisma.$transaction([
    prisma.partnerRevenueShareReportItem.deleteMany({
      where: { partnerRevenueShareReportId: { in: ids } },
    }),
    prisma.partnerRevenueShareReport.updateMany({
      where: { id: { in: ids } },
      data: {
        isDeleted: true,
        deletedAt,
      },
    }),
    prisma.file.updateMany({
      where: { id: { in: fileIds }, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt,
      },
    }),
  ]);

  return { purged: ids.length };
}
