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
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id="invoice-detail-title" className="text-lg font-semibold text-foreground">
              Invoice details
            </h2>
            {detail ? (
              <p className="mt-1 text-sm text-foreground-muted">
                {detail.invoiceNumber ?? `Invoice #${detail.id}`} — {detail.periodLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-foreground-subtle hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-foreground-subtle">Loading invoice details…</p>
          ) : detail ? (
            <div className="space-y-6">
              {justAcknowledged ? (
                <p className="rounded border border-success-border bg-success-muted px-4 py-3 text-sm text-success">
                  Invoice acknowledged on first view.
                </p>
              ) : null}

              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-foreground-subtle">Partner</dt>
                  <dd className="font-medium text-foreground">{detail.partnerName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Status</dt>
                  <dd className="font-medium text-foreground">{detail.statusLabel}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Payment</dt>
                  <dd className="font-medium text-foreground">{detail.paymentStatusLabel}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Issued</dt>
                  <dd className="font-medium text-foreground">
                    {formatDateTime(detail.issuedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Acknowledged</dt>
                  <dd className="font-medium text-foreground">
                    {detail.acknowledgedAt
                      ? formatDateTime(detail.acknowledgedAt)
                      : "Not yet acknowledged"}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Total</dt>
                  <dd className="font-medium text-foreground">
                    {formatCurrency(detail.totalAmount, detail.currencyCode)}
                  </dd>
                </div>
              </dl>

              <div>
                <h3 className="text-sm font-semibold text-foreground">Line items</h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-surface-muted text-left text-foreground-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium">Qty</th>
                        <th className="px-3 py-2 font-medium">Unit price</th>
                        <th className="px-3 py-2 font-medium">Line total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.lineItems.map((item, index) => (
                        <tr key={`${item.description}-${index}`}>
                          <td className="px-3 py-2 text-foreground">{item.description}</td>
                          <td className="px-3 py-2 text-foreground-muted">{item.quantity}</td>
                          <td className="px-3 py-2 text-foreground-muted">
                            {formatCurrency(item.unitPrice, detail.currencyCode)}
                          </td>
                          <td className="px-3 py-2 text-foreground-muted">
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
          <div className="border-t border-border px-6 py-4 print:hidden">
            <Link
              href={`/opco/invoices/${detail.id}/print`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-foreground underline hover:text-foreground-muted"
            >
              Open print view
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
