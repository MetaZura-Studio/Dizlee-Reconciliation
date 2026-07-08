"use client";

import { useState } from "react";

import type { PartnerInvoiceLifecycleDetail } from "@/lib/partner/invoices/lifecycle";
import type { PartnerInvoiceDetail } from "@/lib/partner/queries/invoices";

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type InvoiceDetailModalProps = {
  invoiceId: string;
  detail: PartnerInvoiceDetail | null;
  loading: boolean;
  onClose: () => void;
};

type ActiveTab = "details" | "lifecycle";

export function InvoiceDetailModal({
  invoiceId,
  detail,
  loading,
  onClose,
}: InvoiceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("details");
  const [lifecycle, setLifecycle] = useState<PartnerInvoiceLifecycleDetail | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  async function openLifecycleTab() {
    setActiveTab("lifecycle");

    if (lifecycle?.invoiceId === invoiceId || lifecycleLoading) {
      return;
    }

    setLifecycleLoading(true);
    try {
      const response = await fetch(`/api/partner/invoices/${invoiceId}/lifecycle`);
      const payload = (await response.json()) as {
        lifecycle?: PartnerInvoiceLifecycleDetail;
      };

      if (response.ok && payload.lifecycle) {
        setLifecycle(payload.lifecycle);
      } else {
        setLifecycle(null);
      }
    } catch {
      setLifecycle(null);
    } finally {
      setLifecycleLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="invoice-detail-title" className="text-lg font-semibold text-zinc-900">
                Invoice
              </h2>
              {detail ? (
                <p className="mt-1 text-sm text-zinc-600">
                  {detail.invoiceNumber ?? `Invoice #${detail.id}`} — {detail.periodLabel}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                activeTab === "details"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => void openLifecycleTab()}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                activeTab === "lifecycle"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Lifecycle
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading invoice…</p>
          ) : activeTab === "details" && detail ? (
            <div className="space-y-6">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">OpCo</dt>
                  <dd className="font-medium text-zinc-900">{detail.opcoName}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="font-medium text-zinc-900">{detail.statusLabel}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Payment</dt>
                  <dd className="font-medium text-zinc-900">{detail.paymentStatusLabel}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Uploaded</dt>
                  <dd className="font-medium text-zinc-900">
                    {formatDateTime(detail.uploadedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Acknowledged by Dizlee</dt>
                  <dd className="font-medium text-zinc-900">
                    {formatDateTime(detail.acknowledgedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Total</dt>
                  <dd className="font-medium text-zinc-900">
                    {formatCurrency(detail.totalAmount, detail.currencyCode)}
                  </dd>
                </div>
              </dl>

              {detail.previewUrl ? (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Invoice PDF</h3>
                  <a
                    href={detail.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-zinc-900 underline"
                  >
                    {detail.filename ?? "View PDF"}
                  </a>
                </div>
              ) : null}

              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Line items</h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50 text-left text-zinc-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium">Qty</th>
                        <th className="px-3 py-2 font-medium">Unit price</th>
                        <th className="px-3 py-2 font-medium">Line total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {detail.lineItems.map((item, index) => (
                        <tr key={`${item.description}-${index}`}>
                          <td className="px-3 py-2 text-zinc-900">{item.description}</td>
                          <td className="px-3 py-2 text-zinc-700">{item.quantity}</td>
                          <td className="px-3 py-2 text-zinc-700">
                            {formatCurrency(item.unitPrice, detail.currencyCode)}
                          </td>
                          <td className="px-3 py-2 text-zinc-700">
                            {formatCurrency(item.lineTotal, detail.currencyCode)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === "lifecycle" ? (
            lifecycleLoading ? (
              <p className="text-sm text-zinc-500">Loading lifecycle…</p>
            ) : lifecycle ? (
              <div className="space-y-6">
                <ol className="space-y-3">
                  {lifecycle.steps.map((step) => (
                    <li
                      key={step.code}
                      className={`flex items-start justify-between rounded-lg border px-4 py-3 text-sm ${
                        step.completed
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-zinc-900">{step.label}</p>
                        <p className="text-xs text-zinc-500">{step.code}</p>
                      </div>
                      <p className="text-zinc-600">{formatDateTime(step.completedAt)}</p>
                    </li>
                  ))}
                </ol>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Activity log</h3>
                  {lifecycle.activities.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">No activity recorded yet.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                      {lifecycle.activities.map((entry) => (
                        <li key={entry.id} className="px-4 py-3 text-sm">
                          <p className="font-medium text-zinc-900">{entry.action}</p>
                          <p className="text-zinc-600">
                            {entry.actorName}
                            {entry.previousStatus && entry.newStatus
                              ? ` — ${entry.previousStatus} → ${entry.newStatus}`
                              : null}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Lifecycle data is unavailable.</p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
