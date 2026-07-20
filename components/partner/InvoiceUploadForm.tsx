"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import type { LinkedOpco } from "@/lib/partner/queries/opcos";
import { getDefaultPeriod } from "@/lib/partner/period";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { ui } from "@/lib/ui/classes";

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

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);
  const monthOptions = MONTHS.slice(0, maxMonth);

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    const capped = getMaxMonthForYear(nextYear);
    if (month > capped) {
      setMonth(capped);
    }
  }

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
      <div className={ui.alertWarning}>
        No OpCos are linked to your partner account yet. Ask an admin to configure
        OpCo–Partner links before uploading invoices.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="invoice-opco" required>OpCo</FieldLabel>
          <Select
            id="invoice-opco"
            name="opcoId"
            value={opcoId}
            onChange={(event) => setOpcoId(event.target.value)}
            required
          >
            {opcos.map((opco) => (
              <option key={opco.id} value={opco.id}>
                {opco.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <FieldLabel htmlFor="invoice-year" required>Year</FieldLabel>
          <Select
            id="invoice-year"
            name="year"
            value={year}
            onChange={(event) => handleYearChange(Number(event.target.value))}
            required
          >
            {yearOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <FieldLabel htmlFor="invoice-month" required>Month</FieldLabel>
          <Select
            id="invoice-month"
            name="month"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            required
          >
            {monthOptions.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2">
          <FieldLabel htmlFor="invoice-number">Invoice number (optional)</FieldLabel>
          <Input
            id="invoice-number"
            name="invoiceNumber"
            type="text"
            maxLength={64}
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            placeholder="Auto-generated if left blank"
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel htmlFor="invoice-file" required>Invoice PDF</FieldLabel>
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
          <Button type="button" variant="ghost" onClick={() => setLineItems((current) => [...current, emptyLine()])}>
            Add line
          </Button>
        </div>

        <div className="space-y-3">
          {lineItems.map((line, index) => (
            <div
              key={index}
              className={`grid gap-3 sm:grid-cols-4 ${ui.cardPadding}`}
            >
              <div className="sm:col-span-2">
                <FieldLabel required>Description</FieldLabel>
                <Input
                  type="text"
                  value={line.description}
                  onChange={(event) => updateLine(index, "description", event.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Quantity</FieldLabel>
                <Input
                  type="number"
                  min={0.0001}
                  step="any"
                  value={line.quantity}
                  onChange={(event) => updateLine(index, "quantity", event.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Unit price</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={line.unitPrice}
                  onChange={(event) => updateLine(index, "unitPrice", event.target.value)}
                  required
                />
              </div>
              {lineItems.length > 1 ? (
                <div className="sm:col-span-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-danger"
                    onClick={() =>
                      setLineItems((current) =>
                        current.filter((_, lineIndex) => lineIndex !== index),
                      )
                    }
                  >
                    Remove line
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {error ? <p className={ui.alertError}>{error}</p> : null}

      {successInvoiceId ? (
        <div className={ui.alertSuccess}>
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Uploading..." : "Upload invoice"}
      </Button>
    </form>
  );
}
