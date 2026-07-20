"use client";

import Link from "next/link";

import {
  DizleeOpcoInvoiceDocument,
  type DizleeOpcoInvoiceDocumentProps,
} from "@/components/shared/dizlee-opco-invoice-document";

type DizleeOpcoInvoicePrintViewProps = DizleeOpcoInvoiceDocumentProps & {
  backHref: string;
  backLabel: string;
};

export function DizleeOpcoInvoicePrintView({
  backHref,
  backLabel,
  ...documentProps
}: DizleeOpcoInvoicePrintViewProps) {
  return (
    <div className="mx-auto max-w-5xl text-zinc-900">
      <div
        data-print-hide
        className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden"
      >
        <Link
          href={backHref}
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          {backLabel}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Print
        </button>
      </div>

      <DizleeOpcoInvoiceDocument {...documentProps} />
    </div>
  );
}
