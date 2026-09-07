"use client";

import { DizleeOpcoInvoiceCopies } from "@/components/shared/dizlee-opco-invoice-copies";
import Link from "next/link";
import type { DizleeOpcoInvoiceCopiesProps } from "@/components/shared/dizlee-opco-invoice-copies";

type DizleeOpcoInvoicePrintViewProps = DizleeOpcoInvoiceCopiesProps & {
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

      <DizleeOpcoInvoiceCopies {...documentProps} />
    </div>
  );
}
