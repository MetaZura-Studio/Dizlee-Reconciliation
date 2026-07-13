"use client";

import Link from "next/link";
import { useState } from "react";

import { ReportDetailModal } from "@/components/dizlee/report-detail-modal";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import type { ReconciliationDetail } from "@/lib/dizlee/reconciliation";
import type { ReportDetail } from "@/lib/dizlee/reports";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPeriod(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatUsd(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function isMatchedStatus(status: string): boolean {
  return status.replaceAll(" ", "_").toUpperCase() === "MATCHED";
}

function rowToneClass(status: string): string {
  return isMatchedStatus(status)
    ? "bg-success-muted text-success"
    : "bg-danger-muted text-danger";
}

function statusBadgeClass(status: string): string {
  return isMatchedStatus(status)
    ? "rounded-full bg-success-muted px-2 py-0.5 text-xs font-medium text-success"
    : "rounded-full bg-danger-muted px-2 py-0.5 text-xs font-medium text-danger";
}

function buildDefaultAlert(detail: ReconciliationDetail): {
  subject: string;
  body: string;
} {
  const period = formatPeriod(detail.period.month, detail.period.year);
  const outcome =
    detail.unmatchedCount === 0
      ? "all line items matched"
      : `${detail.unmatchedCount} mismatched / unmatched line item(s)`;

  return {
    subject: `Reconciliation update — ${detail.opcoName} / ${detail.partnerName} (${period})`,
    body: [
      `Hello,`,
      ``,
      `Reconciliation results for ${detail.opcoName} / ${detail.partnerName} (${period}):`,
      ``,
      `- Status: ${detail.status}`,
      `- Matched: ${detail.matchedCount}`,
      `- Unmatched: ${detail.unmatchedCount}`,
      `- Total variance: ${formatUsd(detail.totalVariance)}`,
      `- Tolerance: ${detail.tolerancePercent}%`,
      ``,
      `Outcome: ${outcome}.`,
      ``,
      `Please review the reconciliation result in Dizlee.`,
    ].join("\n"),
  };
}

type ReconciliationResultViewProps = {
  initialDetail: ReconciliationDetail;
};

export function ReconciliationResultView({
  initialDetail,
}: ReconciliationResultViewProps) {
  const [detail, setDetail] = useState(initialDetail);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [alertSubject, setAlertSubject] = useState("");
  const [alertBody, setAlertBody] = useState("");

  async function openReportDetail(reportId: string) {
    setReportDetailOpen(true);
    setReportDetailLoading(true);
    setReportDetail(null);
    try {
      const response = await fetch(`/api/dizlee/reports/${reportId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load report");
      }
      setReportDetail(payload.data as ReportDetail);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Failed to load report",
      );
      setReportDetailOpen(false);
    } finally {
      setReportDetailLoading(false);
    }
  }

  async function confirmReconciliation() {
    setConfirming(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/dizlee/reconciliation/${detail.id}/confirm`,
        { method: "PATCH" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to confirm reconciliation");
      }
      setMessage(payload.data?.message ?? "Reconciliation confirmed.");

      const refresh = await fetch(`/api/dizlee/reconciliation/${detail.id}`);
      const refreshPayload = await refresh.json();
      if (refresh.ok) {
        setDetail(refreshPayload.data as ReconciliationDetail);
      }
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Failed to confirm reconciliation",
      );
    } finally {
      setConfirming(false);
    }
  }

  function openAlertModal() {
    const next = buildDefaultAlert(detail);
    setAlertSubject(next.subject);
    setAlertBody(next.body);
    setAlertOpen(true);
  }

  async function sendAlert(audience: "opco" | "partner" | "both") {
    setAlerting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/dizlee/notifications/intimations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          messageSource: "custom",
          opcoIds: audience === "partner" ? [] : [detail.opcoId],
          partnerIds: audience === "opco" ? [] : [detail.partnerId],
          month: detail.period.month,
          year: detail.period.year,
          subject: alertSubject,
          body: alertBody,
          priority: detail.unmatchedCount > 0 ? "HIGH" : "NORMAL",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send alert");
      }
      setMessage(payload.data?.message ?? "Alert sent.");
      setAlertOpen(false);
    } catch (alertError) {
      setError(
        alertError instanceof Error ? alertError.message : "Failed to send alert",
      );
    } finally {
      setAlerting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-foreground-muted">
            <Link
              href="/dizlee/reconciliation?tab=history"
              className="underline hover:text-foreground"
            >
              ← Back to reconciliation history
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            {detail.opcoName} / {detail.partnerName}
          </h1>
          <p className="mt-1 text-sm text-foreground-subtle">
            {formatPeriod(detail.period.month, detail.period.year)} ·{" "}
            {detail.status}
          </p>
          <p className="mt-1 text-xs text-foreground-subtle">
            OpCo file:{" "}
            <ReportFilenameLink
              filename={detail.opcoReportFilename}
              onClick={() => void openReportDetail(detail.opcoReportId)}
            />{" "}
            · Partner file:{" "}
            <ReportFilenameLink
              filename={detail.partnerReportFilename}
              onClick={() => void openReportDetail(detail.partnerReportId)}
            />
          </p>
        </div>
        <button
          type="button"
          onClick={openAlertModal}
          className="rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
        >
          Alert OpCo / Partner
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-danger-border bg-danger-muted p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-md border border-success-border bg-success-muted p-4 text-sm text-success">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Matched</p>
          <p className="font-medium text-success">{detail.matchedCount}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Unmatched</p>
          <p className="font-medium text-danger">{detail.unmatchedCount}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Total variance</p>
          <p className="font-medium text-foreground">
            {formatUsd(detail.totalVariance)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Tolerance</p>
          <p className="font-medium text-foreground">{detail.tolerancePercent}%</p>
        </div>
      </div>

      {detail.canConfirm ? (
        <button
          type="button"
          disabled={confirming}
          onClick={() => void confirmReconciliation()}
          className="rounded-md bg-success px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-success/90 disabled:opacity-40"
        >
          {confirming ? "Confirming…" : "Confirm reconciliation"}
        </button>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                Service
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                OpCo (USD)
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                Partner (USD)
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                Variance
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                Confirmed
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {detail.items.map((item) => (
              <tr key={item.serviceCode} className={rowToneClass(item.matchStatus)}>
                <td className="px-4 py-3 font-medium">
                  {item.description ?? item.serviceCode}
                </td>
                <td className="px-4 py-3">{formatUsd(item.opcoAmount)}</td>
                <td className="px-4 py-3">{formatUsd(item.partnerAmount)}</td>
                <td className="px-4 py-3">{formatUsd(item.varianceAmount)}</td>
                <td className="px-4 py-3">{formatUsd(item.confirmedValue)}</td>
                <td className="px-4 py-3">
                  <span className={statusBadgeClass(item.matchStatus)}>
                    {item.matchStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-foreground-subtle">
        Run at {formatDateTime(detail.runAt)}
      </p>

      {alertOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-xl rounded-lg bg-surface p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recon-alert-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="recon-alert-title"
                  className="text-lg font-semibold text-foreground"
                >
                  Alert OpCo / Partner
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Notify {detail.opcoName} and/or {detail.partnerName} about this
                  reconciliation outcome.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAlertOpen(false)}
                className="text-sm text-foreground-subtle hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-foreground-muted">Subject</span>
                <input
                  type="text"
                  value={alertSubject}
                  onChange={(event) => setAlertSubject(event.target.value)}
                  maxLength={255}
                  className="mt-1 w-full rounded border border-border-strong px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-foreground-muted">Message</span>
                <textarea
                  value={alertBody}
                  onChange={(event) => setAlertBody(event.target.value)}
                  rows={8}
                  className="mt-1 w-full rounded border border-border-strong px-3 py-2"
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={alerting}
                  onClick={() => void sendAlert("opco")}
                  className="rounded border border-border-strong px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
                >
                  Alert OpCo
                </button>
                <button
                  type="button"
                  disabled={alerting}
                  onClick={() => void sendAlert("partner")}
                  className="rounded border border-border-strong px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
                >
                  Alert Partner
                </button>
                <button
                  type="button"
                  disabled={alerting}
                  onClick={() => void sendAlert("both")}
                  className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
                >
                  {alerting ? "Sending…" : "Alert both"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reportDetailOpen ? (
        <ReportDetailModal
          detail={reportDetail}
          loading={reportDetailLoading}
          onClose={() => {
            setReportDetailOpen(false);
            setReportDetail(null);
          }}
        />
      ) : null}
    </div>
  );
}
