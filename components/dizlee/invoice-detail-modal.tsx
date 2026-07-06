"use client";

import type { InvoiceDetail } from "@/lib/dizlee/invoices";
import type { InvoiceBankDetails } from "@/lib/dizlee/invoice-bank-details";

function formatBytes(size: number | null): string {
  if (size === null) {
    return "—";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
}

function BankDetailsBlock({ details }: { details: InvoiceBankDetails }) {
  return (
    <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
      {details.bankName ? (
        <div>
          <dt className="text-zinc-500">Bank</dt>
          <dd className="text-zinc-900">{details.bankName}</dd>
        </div>
      ) : null}
      {details.accountName ? (
        <div>
          <dt className="text-zinc-500">Account name</dt>
          <dd className="text-zinc-900">{details.accountName}</dd>
        </div>
      ) : null}
      {details.accountNumber ? (
        <div>
          <dt className="text-zinc-500">Account number</dt>
          <dd className="text-zinc-900">{details.accountNumber}</dd>
        </div>
      ) : null}
      {details.iban ? (
        <div>
          <dt className="text-zinc-500">IBAN</dt>
          <dd className="text-zinc-900">{details.iban}</dd>
        </div>
      ) : null}
      {details.swift ? (
        <div>
          <dt className="text-zinc-500">SWIFT</dt>
          <dd className="text-zinc-900">{details.swift}</dd>
        </div>
      ) : null}
      {details.reference ? (
        <div className="sm:col-span-2">
          <dt className="text-zinc-500">Payment reference</dt>
          <dd className="text-zinc-900">{details.reference}</dd>
        </div>
      ) : null}
    </dl>
  );
}

type InvoiceDetailModalProps = {
  detail: InvoiceDetail | null;
  loading: boolean;
  actionLoading?: boolean;
  actionError?: string | null;
  onClose: () => void;
  onMarkPayment?: (invoiceId: string) => void;
};

export function InvoiceDetailModal({
  detail,
  loading,
  actionLoading = false,
  actionError = null,
  onClose,
  onMarkPayment,
}: InvoiceDetailModalProps) {
  if (!detail && !loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="invoice-detail-title" className="text-lg font-semibold text-zinc-900">
            Invoice details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            Close
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading invoice details…</p>
        ) : detail ? (
          <div className="mt-4 space-y-6">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Invoice number</dt>
                <dd className="font-medium text-zinc-900">
                  {detail.invoiceNumber ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Period</dt>
                <dd className="font-medium text-zinc-900">{detail.period.label}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Direction</dt>
                <dd className="font-medium text-zinc-900">{detail.direction}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">OpCo</dt>
                <dd className="font-medium text-zinc-900">{detail.opcoName}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Partner</dt>
                <dd className="font-medium text-zinc-900">
                  {detail.partnerName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Uploaded</dt>
                <dd className="font-medium text-zinc-900">
                  {formatDateTime(detail.uploadedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Invoice status</dt>
                <dd className="font-medium text-zinc-900">{detail.invoiceStatus}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Payment status</dt>
                <dd className="font-medium text-zinc-900">{detail.paymentStatus}</dd>
              </div>
              {detail.acknowledgedAt ? (
                <div>
                  <dt className="text-zinc-500">Acknowledged</dt>
                  <dd className="font-medium text-zinc-900">
                    {formatDateTime(detail.acknowledgedAt)}
                  </dd>
                </div>
              ) : null}
              {detail.paidAt ? (
                <div>
                  <dt className="text-zinc-500">Paid</dt>
                  <dd className="font-medium text-zinc-900">
                    {formatDateTime(detail.paidAt)}
                  </dd>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">Total</dt>
                <dd className="font-medium text-zinc-900">
                  {formatMoney(detail.totalAmount, detail.currencyCode)}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="text-sm font-medium text-zinc-700">Preview</h3>
              {detail.previewUrl ? (
                <p className="mt-2 text-sm text-zinc-600">
                  {detail.filename ?? "Uploaded file"}{" "}
                  <span className="text-zinc-400">
                    ({formatBytes(detail.fileSizeBytes)})
                  </span>{" "}
                  <a
                    href={detail.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-700 underline hover:text-zinc-900"
                  >
                    Open file
                  </a>
                </p>
              ) : detail.isDigital ? (
                detail.bankDetails ? (
                  <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-sm font-medium text-zinc-900">
                      Digital invoice — payment details
                    </p>
                    <BankDetailsBlock details={detail.bankDetails} />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    Digital invoice created. Bank details will appear when configured
                    in admin settings.
                  </p>
                )
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No file attached.</p>
              )}
            </div>

            {detail.lineItems.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-zinc-700">Line items</h3>
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200">
                  <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-zinc-600">
                          Description
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-zinc-600">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-zinc-600">
                          Unit price
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-zinc-600">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white">
                      {detail.lineItems.map((item) => (
                        <tr key={`${item.description}-${item.lineTotal}`}>
                          <td className="px-3 py-2 text-zinc-900">
                            {item.description}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-600">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-600">
                            {formatMoney(item.unitPrice, detail.currencyCode)}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-600">
                            {formatMoney(item.lineTotal, detail.currencyCode)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {detail.canMarkPayment && onMarkPayment ? (
              <div className="border-t border-zinc-200 pt-4">
                {actionError ? (
                  <p className="mb-3 text-sm text-red-700">{actionError}</p>
                ) : null}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Mark this invoice as paid? This records payment collection from the OpCo.",
                      )
                    ) {
                      onMarkPayment(detail.id);
                    }
                  }}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {actionLoading ? "Saving…" : "Mark payment done"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
