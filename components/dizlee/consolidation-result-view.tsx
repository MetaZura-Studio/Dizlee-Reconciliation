"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PageCard } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import type { ConsolidationDetail } from "@/lib/dizlee/consolidation";
import { ui } from "@/lib/ui/classes";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatUsd(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-KW", {
    style: "currency",
    currency: "KWD",
    maximumFractionDigits: 3,
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}

function statusTone(status: string): "success" | "info" | "warning" | "neutral" {
  const normalized = status.replaceAll(" ", "_").toUpperCase();
  if (normalized === "GENERATED" || normalized === "COMPLETED") {
    return "success";
  }
  if (normalized === "FAILED") {
    return "warning";
  }
  return "info";
}

type ConsolidationResultViewProps = {
  initialDetail: ConsolidationDetail;
};

export function ConsolidationResultView({
  initialDetail,
}: ConsolidationResultViewProps) {
  const [detail] = useState(initialDetail);
  const [downloading, setDownloading] = useState(false);

  function downloadExcel() {
    setDownloading(true);
    window.location.href = `/api/dizlee/consolidation/${detail.id}/export`;
    window.setTimeout(() => setDownloading(false), 1500);
  }

  return (
    <PageCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-foreground-muted">
            <Link
              href="/dizlee/consolidation?tab=history"
              className="underline hover:text-foreground"
            >
              ← Back to consolidation history
            </Link>
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {detail.opcoName}
          </h1>
          <p className="mt-1 text-sm text-foreground-subtle">
            {detail.period.label} ·{" "}
            <StatusPill tone={statusTone(detail.status)}>{detail.status}</StatusPill>
          </p>
          <p className="mt-1 text-xs text-foreground-subtle">
            Generated {formatDateTime(detail.generatedAt)} by {detail.runBy}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={downloading}
          onClick={downloadExcel}
        >
          {downloading ? "Downloading…" : "Download Excel"}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Total KWD</p>
          <p className="font-medium text-foreground">
            {formatUsd(detail.totalAmountUsd)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Line items</p>
          <p className="font-medium text-foreground">{detail.items.length}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-foreground-subtle">Period</p>
          <p className="font-medium text-foreground">{detail.period.label}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)]">
        <table className="min-w-[64rem] w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-surface-muted text-left text-xs font-semibold tracking-wide text-foreground-muted">
            <tr>
              <th className="whitespace-nowrap px-4 py-3.5">Partner</th>
              <th className="whitespace-nowrap px-4 py-3.5">Service</th>
              <th className="whitespace-nowrap px-4 py-3.5">Description</th>
              <th className="whitespace-nowrap px-4 py-3.5 text-right">Usage</th>
              <th className="whitespace-nowrap px-4 py-3.5 text-right">Unit</th>
              <th className="whitespace-nowrap px-4 py-3.5 text-right">KWD</th>
              <th className="whitespace-nowrap px-4 py-3.5 text-right">
                Exchange rate
              </th>
              <th className="whitespace-nowrap px-4 py-3.5">Revenue basis</th>
            </tr>
          </thead>
          <tbody>
            {detail.items.map((item, index) => (
              <tr key={`${item.partnerName}-${item.serviceCode}-${index}`}>
                <td className="whitespace-nowrap border-t border-border px-4 py-3.5 text-foreground">
                  {item.partnerName}
                </td>
                <td className="whitespace-nowrap border-t border-border px-4 py-3.5 text-foreground-muted">
                  {item.serviceCode ?? "—"}
                </td>
                <td className="min-w-[14rem] border-t border-border px-4 py-3.5 text-foreground-muted">
                  {item.description || "—"}
                </td>
                <td className="whitespace-nowrap border-t border-border px-4 py-3.5 text-right text-foreground-muted">
                  {formatNumber(item.usageAmount)}
                </td>
                <td className="whitespace-nowrap border-t border-border px-4 py-3.5 text-right text-foreground-muted">
                  {item.usageUnit ?? "—"}
                </td>
                <td className="whitespace-nowrap border-t border-border px-4 py-3.5 text-right text-foreground-muted">
                  {formatUsd(item.usageUsd)}
                </td>
                <td className="whitespace-nowrap border-t border-border px-4 py-3.5 text-right text-foreground-muted">
                  {formatNumber(item.exchangeRate)}
                </td>
                <td className="whitespace-nowrap border-t border-border px-4 py-3.5 text-foreground-muted">
                  {item.revenueBasis ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail.items.length === 0 ? (
        <p className={`mt-4 ${ui.hint}`}>No consolidation line items.</p>
      ) : null}
    </PageCard>
  );
}
