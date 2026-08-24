/**
 * Dizlee Revenue Share Report: readiness + OpCo/Partner USD rows for Excel export.
 *
 * Formulas:
 * - OpCo USD = OpCo local amount × Admin monthly USD rate
 * - Partner USD = Partner line amount (already USD)
 * - Revenue Share % = OpCo report_line_items.revenue_share_percent
 *   (fallback: sourceColumns.revenue_share_percent for older rows)
 * - Regulatory Fee = OpCo USD × OpCo vatPercent / 100 (fee on the OpCo record)
 * - Net Revenue = OpCo USD − Regulatory Fee
 *
 * Gate: latest OpCo report and latest Partner report for every Partner
 * that appears in the OpCo file for the period (not every linked Partner).
 */

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import { normalizeServiceName } from "@/lib/dizlee/reconciliation/compare";
import { DomainError } from "@/lib/errors/app-error";
import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import { applyReportFxToAmount, getOpcoReportFx } from "@/lib/platform/report-fx";
import { prisma } from "@/lib/prisma";

export type RevenueShareReadinessPartner = {
  partnerId: string;
  partnerName: string;
  hasOpcoReport: boolean;
  hasPartnerReport: boolean;
  opcoLineItemCount: number;
  partnerLineItemCount: number;
};

export type RevenueShareReadiness = {
  opcoId: string;
  opcoName: string;
  vatPercent: number;
  period: DashboardPeriod;
  linkedCount: number;
  ready: boolean;
  missing: string[];
  partners: RevenueShareReadinessPartner[];
};

export type RevenueShareLine = {
  partnerName: string;
  serviceName: string;
  opcoAmountUsd: number | null;
  partnerAmountUsd: number | null;
  regulatoryFee: number;
  netRevenue: number;
  revenueSharePercent: number | null;
};

export type RevenueShareReport = {
  opcoId: string;
  opcoName: string;
  vatPercent: number;
  period: DashboardPeriod;
  lines: RevenueShareLine[];
};

export class RevenueShareError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("RevenueShareError", keyOrMessage, status);
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

export function parseSourceRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const raw =
    typeof value === "number" ? value : Number(String(value).replace(/%/g, "").trim());
  return Number.isFinite(raw) ? raw : null;
}

export function revenueSharePercentFromSource(
  source: Record<string, unknown>,
): number | null {
  return toFiniteNumber(source.revenue_share_percent);
}

export function resolveRevenueSharePercent(input: {
  revenueSharePercent?: unknown;
  sourceColumns?: unknown;
}): number | null {
  const fromField = toFiniteNumber(input.revenueSharePercent);
  if (fromField !== null) {
    return fromField;
  }
  return revenueSharePercentFromSource(parseSourceRecord(input.sourceColumns));
}

export function vatPercentFromOpco(value: unknown): number {
  return toFiniteNumber(value) ?? 0;
}

/** Regulatory fee = Gross × OpCo tax % (Admin vatPercent). */
export function regulatoryFeeFromVatPercent(
  grossAmount: number,
  vatPercent: number,
): number {
  return (grossAmount * vatPercent) / 100;
}

export function netRevenueFromGross(grossAmount: number, regulatoryFee: number): number {
  return grossAmount - regulatoryFee;
}

export function buildRevenueShareLine(input: {
  partnerName: string;
  serviceName: string;
  opcoAmountUsd: number | null;
  partnerAmountUsd?: number | null;
  vatPercent: number;
  revenueSharePercent?: unknown;
  sourceColumns?: unknown;
}): RevenueShareLine {
  const source = parseSourceRecord(input.sourceColumns);
  const opcoAmountUsd = input.opcoAmountUsd;
  const partnerAmountUsd =
    input.partnerAmountUsd === undefined ? null : input.partnerAmountUsd;
  const grossForFee = opcoAmountUsd ?? 0;
  const regulatoryFee = regulatoryFeeFromVatPercent(grossForFee, input.vatPercent);
  return {
    partnerName: input.partnerName,
    serviceName: input.serviceName,
    opcoAmountUsd,
    partnerAmountUsd,
    regulatoryFee,
    netRevenue: netRevenueFromGross(grossForFee, regulatoryFee),
    revenueSharePercent: resolveRevenueSharePercent({
      revenueSharePercent: input.revenueSharePercent,
      sourceColumns: source,
    }),
  };
}

export function parseRevenueShareFilters(searchParams: URLSearchParams): {
  month: number;
  year: number;
  opcoId?: string;
} {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month") ?? fallback.month);
  const year = Number(searchParams.get("year") ?? fallback.year);
  const opcoId = searchParams.get("opcoId")?.trim() || undefined;
  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year: Number.isInteger(year) && year >= 2000 ? year : fallback.year,
    opcoId,
  };
}

type ReportLite = {
  partnerId: bigint;
  version: number;
  lineItems: Array<{
    description: string | null;
    amount: unknown;
    revenueSharePercent: unknown;
    sourceColumns: unknown;
  }>;
  partner: { name: string };
};

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

type AggregatedServiceLine = {
  serviceName: string;
  amount: number;
  revenueSharePercent: unknown;
  sourceColumns: unknown;
};

function aggregateLinesByService(
  items: ReportLite["lineItems"],
  toUsd: (amount: number | null) => number,
): Map<string, AggregatedServiceLine> {
  const map = new Map<string, AggregatedServiceLine>();
  items.forEach((item, index) => {
    const serviceName = serviceNameFromLine(item);
    const key = normalizeServiceName(serviceName, index + 1);
    const amount = toUsd(toFiniteNumber(item.amount));
    const existing = map.get(key);
    if (existing) {
      existing.amount += amount;
      return;
    }
    map.set(key, {
      serviceName,
      amount,
      revenueSharePercent: item.revenueSharePercent,
      sourceColumns: item.sourceColumns,
    });
  });
  return map;
}

function latestByPartner(reports: ReportLite[]): Map<string, ReportLite> {
  const map = new Map<string, ReportLite>();
  for (const report of reports) {
    const key = report.partnerId.toString();
    const existing = map.get(key);
    if (!existing || report.version > existing.version) {
      map.set(key, report);
    }
  }
  return map;
}

/** Revenue share only lists partners the OpCo submitted for the period. */
export function revenueShareReadinessFromPartnerRows(
  partners: RevenueShareReadinessPartner[],
  linkedCount: number,
): Pick<RevenueShareReadiness, "partners" | "missing" | "ready" | "linkedCount"> {
  const submitted = partners.filter((partner) => partner.hasOpcoReport);
  const missing = submitted
    .filter((partner) => !partner.hasPartnerReport)
    .map((partner) => `${partner.partnerName} (Partner report)`);
  return {
    linkedCount,
    partners: submitted,
    missing,
    ready: submitted.length > 0 && missing.length === 0,
  };
}

const reportSelect = {
  partnerId: true,
  version: true,
  partner: { select: { name: true } },
  lineItems: {
    where: { isDeleted: false },
    select: {
      description: true,
      amount: true,
      revenueSharePercent: true,
      sourceColumns: true,
    },
  },
} as const;

async function loadPeriodReports(params: {
  opcoId: bigint;
  month: number;
  year: number;
  roleCode: "OPCO" | "PARTNER";
}): Promise<ReportLite[]> {
  return prisma.report.findMany({
    where: {
      opcoId: params.opcoId,
      month: params.month,
      year: params.year,
      isDeleted: false,
      uploadedByUser: { role: { code: params.roleCode } },
    },
    select: reportSelect,
  });
}

export async function getRevenueShareReadiness(params: {
  month: number;
  year: number;
  opcoId: string;
}): Promise<RevenueShareReadiness> {
  const opco = await prisma.opco.findUnique({
    where: { id: BigInt(params.opcoId) },
    select: { id: true, name: true, vatPercent: true },
  });
  if (!opco) {
    throw new RevenueShareError("OpCo not found.", 404);
  }

  const [links, opcoReports, partnerReports] = await Promise.all([
    prisma.opcoPartnerLink.findMany({
      where: {
        opcoId: opco.id,
        ...ACTIVE_OPCO_PARTNER_LINK_FILTER,
      },
      orderBy: { partner: { name: "asc" } },
      include: { partner: { select: { id: true, name: true } } },
    }),
    loadPeriodReports({
      opcoId: opco.id,
      month: params.month,
      year: params.year,
      roleCode: "OPCO",
    }),
    loadPeriodReports({
      opcoId: opco.id,
      month: params.month,
      year: params.year,
      roleCode: "PARTNER",
    }),
  ]);

  const opcoByPartner = latestByPartner(opcoReports);
  const partnerByPartner = latestByPartner(partnerReports);

  const partners: RevenueShareReadinessPartner[] = links.map((link) => {
    const opcoReport = opcoByPartner.get(link.partnerId.toString());
    const partnerReport = partnerByPartner.get(link.partnerId.toString());
    return {
      partnerId: link.partner.id.toString(),
      partnerName: link.partner.name,
      hasOpcoReport: Boolean(opcoReport && opcoReport.lineItems.length > 0),
      hasPartnerReport: Boolean(partnerReport && partnerReport.lineItems.length > 0),
      opcoLineItemCount: opcoReport?.lineItems.length ?? 0,
      partnerLineItemCount: partnerReport?.lineItems.length ?? 0,
    };
  });

  return {
    opcoId: opco.id.toString(),
    opcoName: opco.name,
    vatPercent: vatPercentFromOpco(opco.vatPercent),
    period: periodFromParts(params.month, params.year),
    ...revenueShareReadinessFromPartnerRows(partners, links.length),
  };
}

export async function buildRevenueShareReport(params: {
  month: number;
  year: number;
  opcoId: string;
}): Promise<RevenueShareReport> {
  const readiness = await getRevenueShareReadiness(params);
  if (!readiness.ready) {
    throw new RevenueShareError(
      readiness.linkedCount === 0
        ? "This OpCo has no linked Partners."
        : readiness.partners.length === 0
          ? "Upload the OpCo bulk report for this period first."
          : `Upload missing reports first: ${readiness.missing.join(", ")}.`,
      400,
    );
  }

  const [opcoReports, partnerReports, fx] = await Promise.all([
    loadPeriodReports({
      opcoId: BigInt(params.opcoId),
      month: params.month,
      year: params.year,
      roleCode: "OPCO",
    }).then(latestByPartner),
    loadPeriodReports({
      opcoId: BigInt(params.opcoId),
      month: params.month,
      year: params.year,
      roleCode: "PARTNER",
    }).then(latestByPartner),
    getOpcoReportFx({
      opcoId: BigInt(params.opcoId),
      month: params.month,
      year: params.year,
    }),
  ]);

  if (fx.rateToUsd === null) {
    throw new RevenueShareError(
      `No USD rate for ${fx.currencyCode} in this period. Set it in Admin Currencies before generating the RS report.`,
      400,
    );
  }

  const lines: RevenueShareLine[] = [];
  for (const partner of readiness.partners) {
    const opcoReport = opcoReports.get(partner.partnerId);
    const partnerReport = partnerReports.get(partner.partnerId);
    const opcoByService = aggregateLinesByService(opcoReport?.lineItems ?? [], (amount) => {
      const converted = applyReportFxToAmount(amount, fx.rateToUsd);
      return converted.amountUsd === null ? 0 : Number(converted.amountUsd);
    });
    const partnerByService = aggregateLinesByService(
      partnerReport?.lineItems ?? [],
      (amount) => amount ?? 0,
    );
    const serviceKeys = new Set([
      ...opcoByService.keys(),
      ...partnerByService.keys(),
    ]);

    for (const key of [...serviceKeys].sort()) {
      const opco = opcoByService.get(key);
      const partnerLine = partnerByService.get(key);
      lines.push(
        buildRevenueShareLine({
          partnerName: partner.partnerName,
          serviceName: opco?.serviceName ?? partnerLine?.serviceName ?? "—",
          opcoAmountUsd: opco ? opco.amount : null,
          partnerAmountUsd: partnerLine ? partnerLine.amount : null,
          vatPercent: readiness.vatPercent,
          revenueSharePercent: opco?.revenueSharePercent,
          sourceColumns: opco?.sourceColumns,
        }),
      );
    }
  }

  return {
    opcoId: readiness.opcoId,
    opcoName: readiness.opcoName,
    vatPercent: readiness.vatPercent,
    period: readiness.period,
    lines,
  };
}
