"use client";

import Link from "next/link";
import { useState } from "react";

import type { LinkedOpco } from "@/lib/partner/queries/opcos";
import { getDefaultPeriod } from "@/lib/partner/period";

type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceUploadFormProps = {
  opcos: LinkedOpco[];
};

const emptyLine = (): InvoiceLineItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

export function InvoiceUploadForm({ opcos }: InvoiceUploadFormProps) {
  const defaultPeriod = getDefaultPeriod();
  const [opcoId, setOpcoId] = useState(opcos[0]?.id ?? "");
  const [year, setYear] = useState(defaultPeriod.year);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([emptyLine()]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successInvoiceId, setSuccessInvoiceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateLine(
    index: number,
    field: keyof InvoiceLineItem,
    value: string,
  ) {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }
        if (field === "description") {
          return { ...line, description: value };
        }
        return {
          ...line,
          [field]: Number(value),
        };
      }),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessInvoiceId(null);

    if (!file) {
      setError("Invoice PDF is required");
      return;
    }

    const formData = new FormData();
    formData.append("opcoId", opcoId);
    formData.append("year", String(year));
    formData.append("month", String(month));
    if (invoiceNumber.trim()) {
      formData.append("invoiceNumber", invoiceNumber.trim());
    }
    formData.append("lineItems", JSON.stringify(lineItems));
    formData.append("file", file);

    setIsSubmitting(true);
    const form = event.currentTarget;

    try {
      const response = await fetch("/api/partner/invoices/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        invoiceId?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to upload invoice");
        return;
      }

      setSuccessInvoiceId(payload.invoiceId ?? "");
      setFile(null);
      setLineItems([emptyLine()]);
      form.reset();
    } catch {
      setError("Failed to upload invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (opcos.length === 0) {
    return (
      <div className="rounded-lg border border-warning-border bg-warning-muted p-4 text-sm text-warning">
        No OpCos are linked to your partner account yet. Ask an admin to configure
        OpCo–Partner links before uploading invoices.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="invoice-opco" className="text-sm font-medium text-foreground-muted">
            OpCo
          </label>
          <select
            id="invoice-opco"
            name="opcoId"
            value={opcoId}
            onChange={(event) => setOpcoId(event.target.value)}
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
            required
          >
            {opcos.map((opco) => (
              <option key={opco.id} value={opco.id}>
                {opco.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="invoice-year" className="text-sm font-medium text-foreground-muted">
            Year
          </label>
          <input
            id="invoice-year"
            name="year"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="invoice-month" className="text-sm font-medium text-foreground-muted">
            Month
          </label>
          <input
            id="invoice-month"
            name="month"
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="invoice-number"
            className="text-sm font-medium text-foreground-muted"
          >
            Invoice number (optional)
          </label>
          <input
            id="invoice-number"
            name="invoiceNumber"
            type="text"
            maxLength={64}
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            placeholder="Auto-generated if left blank"
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="invoice-file" className="text-sm font-medium text-foreground-muted">
            Invoice PDF
          </label>
          <input
            id="invoice-file"
            name="file"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-foreground-muted"
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Line items</h2>
          <button
            type="button"
            onClick={() => setLineItems((current) => [...current, emptyLine()])}
            className="text-sm text-foreground-muted underline hover:text-foreground"
          >
            Add line
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((line, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-4"
            >
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-foreground-muted">Description</label>
                <input
                  type="text"
                  value={line.description}
                  onChange={(event) => updateLine(index, "description", event.target.value)}
                  className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-muted">Quantity</label>
                <input
                  type="number"
                  min={0.0001}
                  step="any"
                  value={line.quantity}
                  onChange={(event) => updateLine(index, "quantity", event.target.value)}
                  className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-muted">Unit price</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={line.unitPrice}
                  onChange={(event) => updateLine(index, "unitPrice", event.target.value)}
                  className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
                  required
                />
              </div>
              {lineItems.length > 1 ? (
                <div className="sm:col-span-4">
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems((current) =>
                        current.filter((_, lineIndex) => lineIndex !== index),
                      )
                    }
                    className="text-xs text-rose-700 underline"
                  >
                    Remove line
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {successInvoiceId ? (
        <div className="rounded border border-success-border bg-success-muted px-3 py-2 text-sm text-success">
          <p>Invoice uploaded successfully.</p>
          <p className="mt-1">
            <Link href="/partner/invoices/upload" className="underline">
              Upload another invoice
            </Link>
            {" · "}
            <Link href="/partner/invoices" className="underline">
              View invoices
            </Link>
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Uploading..." : "Upload invoice"}
      </button>
    </form>
  );
}
