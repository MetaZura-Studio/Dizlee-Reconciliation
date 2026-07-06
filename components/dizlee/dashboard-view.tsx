"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { DonutChart } from "@/components/dizlee/donut-chart";
import { KpiCard } from "@/components/dizlee/kpi-card";
import type {
  DashboardData,
  DirectionPanel,
  ReconciliationLane,
} from "@/lib/dizlee/dashboard";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function reportsLink(month: number, year: number): string {
  return `/dizlee/reports?month=${month}&year=${year}&from=dashboard`;
}

function reportsMonitoringLink(
  month: number,
  year: number,
  missing?: "opco" | "partner",
): string {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
    from: "dashboard",
  });
  if (missing) {
    params.set("missing", missing);
  }
  return `/dizlee/reports/monitoring?${params.toString()}`;
}

function invoicesLink(
  month: number,
  year: number,
  options?: { paymentStatus?: "paid" | "pending" },
): string {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
    from: "dashboard",
  });
  if (options?.paymentStatus) {
    params.set("paymentStatus", options.paymentStatus);
  }
  return `/dizlee/invoices?${params.toString()}`;
}

function invoicesMonitoringLink(
  month: number,
  year: number,
  missing?: "opco" | "partner",
): string {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
    from: "dashboard",
  });
  if (missing) {
    params.set("missing", missing);
  }
  return `/dizlee/invoices/monitoring?${params.toString()}`;
}

type DashboardViewProps = {
  initialData: DashboardData;
};

export function DashboardView({ initialData }: DashboardViewProps) {
  const [month, setMonth] = useState(initialData.period.month);
  const [year, setYear] = useState(initialData.period.year);
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeriod = useCallback(async (targetMonth: number, targetYear: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/dashboard?month=${targetMonth}&year=${targetYear}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load dashboard");
      }
      setData(payload.data as DashboardData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMonthChange = (nextMonth: number) => {
    setMonth(nextMonth);
    void loadPeriod(nextMonth, year);
  };

  const handleYearChange = (nextYear: number) => {
    setYear(nextYear);
    void loadPeriod(month, nextYear);
  };

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const { billing, reportsRecon, recentUploads } = data;
  const { kpis } = billing;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Dizlee Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Role-specific dashboard with summary cards/widgets.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Month</span>
            <select
              value={month}
              onChange={(event) => handleMonthChange(Number(event.target.value))}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Year</span>
            <select
              value={year}
              onChange={(event) => handleYearChange(Number(event.target.value))}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Updating dashboard…</p>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <BillingSectionView billing={billing} kpis={kpis} month={month} year={year} />

      <ReportsReconSectionView
        reportsRecon={reportsRecon}
        month={month}
        year={year}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900">Upload activity</h2>
        {recentUploads.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Lane
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {recentUploads.map((upload) => (
                  <tr key={upload.id}>
                    <td className="px-4 py-3 text-zinc-900">
                      {upload.actorRole}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{upload.lane}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatDateTime(upload.uploadedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No uploads yet.</p>
        )}
      </section>
    </div>
  );
}

function BillingSectionView({
  billing,
  kpis,
  month,
  year,
}: {
  billing: DashboardData["billing"];
  kpis: DashboardData["billing"]["kpis"];
  month: number;
  year: number;
}) {
  const allInvoicesHref = invoicesLink(month, year);
  const paidInvoicesHref = invoicesLink(month, year, { paymentStatus: "paid" });
  const pendingInvoicesHref = invoicesLink(month, year, {
    paymentStatus: "pending",
  });
  const opcoInvoiceMissingHref = invoicesMonitoringLink(month, year, "opco");
  const partnerInvoiceMissingHref = invoicesMonitoringLink(month, year, "partner");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Billing & revenue</h2>
          <p className="text-sm text-zinc-500">
            Paid OpCo collections on platform; revenue in USD using admin
            exchange rates.
          </p>
        </div>
        <Link
          href={allInvoicesHref}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          View invoices
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Invoices" value={kpis.invoices} href={allInvoicesHref} />
        <KpiCard
          label="Total revenue (paid OpCos)"
          value={usdFormatter.format(kpis.totalRevenuePaidUsd)}
        />
        <KpiCard
          label="Invoices paid"
          value={kpis.invoicesPaid}
          href={paidInvoicesHref}
        />
        <KpiCard
          label="Pending collection"
          value={usdFormatter.format(kpis.pendingCollectionUsd)}
          href={pendingInvoicesHref}
        />
      </div>

      {kpis.missingFxCount > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {kpis.missingFxCount} paid invoice(s) lack an FX rate for this period
          and are excluded from the USD total.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChart
          title="Revenue by OpCo (paid)"
          segments={billing.revenueByOpco}
          formatValue={(value) => usdFormatter.format(value)}
        />
        <DonutChart
          title="Payment status"
          segments={billing.paymentStatus.map((segment) => ({
            ...segment,
            label: segment.label.replaceAll("_", " "),
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DirectionPanelView
          title="Sent to OpCos"
          panel={billing.sentToOpcos}
          missingLabel="OpCos without an invoice"
          missingHref={opcoInvoiceMissingHref}
        />
        <DirectionPanelView
          title="Received from partners"
          panel={billing.receivedFromPartners}
          missingLabel="Partners without an invoice"
          missingHref={partnerInvoiceMissingHref}
        />
      </div>
    </section>
  );
}

function DirectionPanelView({
  title,
  panel,
  missingLabel,
  missingHref,
}: {
  title: string;
  panel: DirectionPanel;
  missingLabel: string;
  missingHref: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <div className="mt-3 flex gap-6 text-sm">
        <div>
          <p className="text-xs text-zinc-500">Invoiced</p>
          <p className="text-lg font-semibold text-zinc-900">
            {panel.invoiced} / {panel.linked}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Paid</p>
          <p className="text-lg font-semibold text-zinc-900">{panel.paid}</p>
        </div>
      </div>
      {panel.missingNames.length > 0 ? (
        <div className="mt-3 text-sm">
          <Link href={missingHref} className="text-zinc-600 hover:text-zinc-900">
            {missingLabel} ({panel.missingNames.length})
          </Link>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {panel.missingNames.join(", ")}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">All lanes invoiced.</p>
      )}
    </div>
  );
}

function ReportsReconSectionView({
  reportsRecon,
  month,
  year,
}: {
  reportsRecon: DashboardData["reportsRecon"];
  month: number;
  year: number;
}) {
  const reportsHref = reportsLink(month, year);
  const opcoMissingHref = reportsMonitoringLink(month, year, "opco");
  const partnerMissingHref = reportsMonitoringLink(month, year, "partner");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">
            Reports & reconciliation
          </h2>
          <p className="text-sm text-zinc-500">
            OpCo and partner report uploads, reconciliation status, and recent
            activity.
          </p>
        </div>
        <div className="text-right text-sm">
          <Link
            href={reportsHref}
            className="text-zinc-600 hover:text-zinc-900"
          >
            View reports
          </Link>
          <p className="text-xs text-zinc-500">
            Latest upload: {formatDateTime(reportsRecon.latestUpload)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Reports submitted" value={reportsRecon.reportsSubmitted} />
        <KpiCard
          label="OpCo reports missing"
          value={reportsRecon.opcoReportsMissing}
          href={opcoMissingHref}
        />
        <KpiCard
          label="Partner reports missing"
          value={reportsRecon.partnerReportsMissing}
          href={partnerMissingHref}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChart
          title="Reports submitted by OpCo"
          segments={reportsRecon.reportsByOpco}
        />
        <DonutChart
          title="Reports submitted by Partner"
          segments={reportsRecon.reportsByPartner}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-700">
            Reconciliation Overview
          </h3>
          <Link
            href="/dizlee/reconciliation"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            View All
          </Link>
        </div>
        {reportsRecon.reconciliation.length > 0 ? (
          <ul className="space-y-2">
            {reportsRecon.reconciliation.map((lane) => (
              <ReconciliationLaneView key={lane.id} lane={lane} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No reconciliation activity yet.</p>
        )}
      </div>
    </section>
  );
}

function ReconciliationLaneView({ lane }: { lane: ReconciliationLane }) {
  return (
    <li>
      <Link
        href={`/dizlee/reconciliation?id=${lane.id}`}
        className="block rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-colors hover:bg-zinc-50"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="truncate text-sm font-medium text-zinc-900">
            {lane.lane}
          </span>
          <span className="shrink-0 text-xs text-zinc-500">{lane.status}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${lane.matchRate}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-zinc-600">
            {lane.matchRate}%
          </span>
        </div>
      </Link>
    </li>
  );
}
