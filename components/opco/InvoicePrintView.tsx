"use client";

import Link from "next/link";

import type { OpcoInvoiceDetail } from "@/lib/opco/queries/invoices";

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    dateStyle: "long",
  });
}

type InvoicePrintViewProps = {
  detail: OpcoInvoiceDetail;
};

export function InvoicePrintView({ detail }: InvoicePrintViewProps) {
  return (
    <div className="mx-auto max-w-4xl text-zinc-900">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/opco/invoices"
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          Back to invoices
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Print
        </button>
      </div>

      <article className="space-y-8">
        <header className="border-b border-zinc-300 pb-6">
          <p className="text-sm uppercase tracking-wide text-zinc-500">Invoice</p>
          <h1 className="mt-2 text-3xl font-semibold">
            {detail.invoiceNumber ?? `Invoice #${detail.id}`}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{detail.periodLabel}</p>
        </header>

        <section className="grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <h2 className="font-semibold text-zinc-900">Bill to</h2>
            <p className="mt-2 text-zinc-700">{detail.opcoName}</p>
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900">Invoice details</h2>
            <dl className="mt-2 space-y-1 text-zinc-700">
              <div className="flex justify-between gap-4">
                <dt>Issued</dt>
                <dd>{formatDate(detail.issuedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Status</dt>
                <dd>{detail.statusLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Payment</dt>
                <dd>{detail.paymentStatusLabel}</dd>
              </div>
              {detail.partnerName ? (
                <div className="flex justify-between gap-4">
                  <dt>Partner</dt>
                  <dd>{detail.partnerName}</dd>
                </div>
              ) : null}
              {detail.acknowledgedAt ? (
                <div className="flex justify-between gap-4">
                  <dt>Acknowledged</dt>
                  <dd>{formatDate(detail.acknowledgedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>

        <section>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-left text-zinc-600">
                <th className="py-2 pr-4 font-medium">Description</th>
                <th className="py-2 pr-4 font-medium">Qty</th>
                <th className="py-2 pr-4 font-medium">Unit price</th>
                <th className="py-2 font-medium text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {detail.lineItems.map((item, index) => (
                <tr key={`${item.description}-${index}`} className="border-b border-zinc-200">
                  <td className="py-3 pr-4 text-zinc-900">{item.description}</td>
                  <td className="py-3 pr-4 text-zinc-700">{item.quantity}</td>
                  <td className="py-3 pr-4 text-zinc-700">
                    {formatCurrency(item.unitPrice, detail.currencyCode)}
                  </td>
                  <td className="py-3 text-right text-zinc-900">
                    {formatCurrency(item.lineTotal, detail.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-4 text-right font-semibold text-zinc-900">
                  Total
                </td>
                <td className="pt-4 text-right text-lg font-semibold text-zinc-900">
                  {formatCurrency(detail.totalAmount, detail.currencyCode)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      </article>
    </div>
  );
}
