/**
 * Reconciliation outcome email copy: template loading and placeholder rendering per side.
 * Consumed after reconciliation runs when alerting OpCo and/or partner users.
 * Template codes RECONCILIATION_ALERT_OPCO / _PARTNER with hardcoded fallback bodies.
 */

import { getActiveEmailTemplate } from "@/lib/platform/email-templates";
import { applyTemplate, periodLabel } from "@/lib/platform/template-placeholders";
import { formatUsd } from "@/lib/platform/format-money";

export const RECONCILIATION_ALERT_OPCO_CODE = "RECONCILIATION_ALERT_OPCO";
export const RECONCILIATION_ALERT_PARTNER_CODE = "RECONCILIATION_ALERT_PARTNER";

export type ReconciliationAlertAudience = "opco" | "partner" | "both";

export type ReconciliationAlertMessage = {
  subject: string;
  body: string;
};

export type ReconciliationAlertTemplates = {
  opco: ReconciliationAlertMessage;
  partner: ReconciliationAlertMessage;
};

export type ReconciliationAlertDetailInput = {
  opcoName: string;
  partnerName: string;
  period: { month: number; year: number };
  status: string;
  matchedCount: number;
  unmatchedCount: number;
  totalVariance: number | null;
  tolerancePercent: number;
};

export function buildReconciliationAlertPlaceholders(
  detail: ReconciliationAlertDetailInput,
): Record<string, string> {
  const period = periodLabel(detail.period.month, detail.period.year);
  const outcome =
    detail.unmatchedCount === 0
      ? "all line items matched"
      : `${detail.unmatchedCount} mismatched / unmatched line item(s)`;

  return {
    period,
    opcoName: detail.opcoName,
    partnerName: detail.partnerName,
    status: detail.status,
    matchedCount: String(detail.matchedCount),
    unmatchedCount: String(detail.unmatchedCount),
    totalVariance: formatUsd(detail.totalVariance),
    tolerancePercent: String(detail.tolerancePercent),
    outcome,
  };
}

export function fallbackReconciliationAlert(
  detail: ReconciliationAlertDetailInput,
): ReconciliationAlertMessage {
  const values = buildReconciliationAlertPlaceholders(detail);
  return {
    subject: `Reconciliation update — ${values.opcoName} / ${values.partnerName} (${values.period})`,
    body: [
      `Hello,`,
      ``,
      `Reconciliation results for ${values.opcoName} / ${values.partnerName} (${values.period}):`,
      ``,
      `- Status: ${values.status}`,
      `- Matched: ${values.matchedCount}`,
      `- Unmatched: ${values.unmatchedCount}`,
      `- Total variance: ${values.totalVariance}`,
      `- Tolerance: ${values.tolerancePercent}%`,
      ``,
      `Outcome: ${values.outcome}.`,
      ``,
      `Please review the reconciliation result in Dizlee.`,
    ].join("\n"),
  };
}

export function renderReconciliationAlert(
  template: ReconciliationAlertMessage,
  placeholders: Record<string, string>,
): ReconciliationAlertMessage {
  return {
    subject: applyTemplate(template.subject, placeholders).slice(0, 255),
    body: applyTemplate(template.body, placeholders),
  };
}

/** Loads side-specific alert templates with placeholder substitution and fallback copy. */
export async function loadReconciliationAlertTemplates(
  detail: ReconciliationAlertDetailInput,
): Promise<ReconciliationAlertTemplates> {
  const placeholders = buildReconciliationAlertPlaceholders(detail);
  const fallback = fallbackReconciliationAlert(detail);

  const [opcoTemplate, partnerTemplate] = await Promise.all([
    getActiveEmailTemplate(RECONCILIATION_ALERT_OPCO_CODE),
    getActiveEmailTemplate(RECONCILIATION_ALERT_PARTNER_CODE),
  ]);

  return {
    opco: opcoTemplate
      ? renderReconciliationAlert(opcoTemplate, placeholders)
      : fallback,
    partner: partnerTemplate
      ? renderReconciliationAlert(partnerTemplate, placeholders)
      : fallback,
  };
}
