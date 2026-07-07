"use client";

import Link from "next/link";

import type { OpcoInvoiceDetail } from "@/lib/opco/queries/invoices";

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type InvoiceDetailModalProps = {
  detail: OpcoInvoiceDetail | null;
  loading: boolean;
  justAcknowledged: boolean;
  onClose: () => void;
};

export function InvoiceDetailModal({
  detail,
  loading,
  justAcknowledged,
  onClose,
}: InvoiceDetailModalProps) {
  if (!detail && !loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 id="invoice-detail-title" className="text-lg font-semibold text-zinc-900">
              Invoice details
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

        <div className="overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading invoice details…</p>
          ) : detail ? (
            <div className="space-y-6">
              {justAcknowledged ? (
                <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Invoice acknowledged on first view.
                </p>
              ) : null}

              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Partner</dt>
                  <dd className="font-medium text-zinc-900">{detail.partnerName ?? "—"}</dd>
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
                  <dt className="text-zinc-500">Issued</dt>
                  <dd className="font-medium text-zinc-900">
                    {formatDateTime(detail.issuedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Acknowledged</dt>
                  <dd className="font-medium text-zinc-900">
                    {detail.acknowledgedAt
                      ? formatDateTime(detail.acknowledgedAt)
                      : "Not yet acknowledged"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Total</dt>
                  <dd className="font-medium text-zinc-900">
                    {formatCurrency(detail.totalAmount, detail.currencyCode)}
                  </dd>
                </div>
              </dl>

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
          ) : null}
        </div>

        {detail ? (
          <div className="border-t border-zinc-200 px-6 py-4 print:hidden">
            <Link
              href={`/opco/invoices/${detail.id}/print`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
            >
              Open print view
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
