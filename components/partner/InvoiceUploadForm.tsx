/**
 * Upload a partner invoice file for a selected OpCo and period.
 * Validates input and registers the submission with the platform.
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { getDefaultPeriod } from "@/lib/partner/period";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { ui } from "@/lib/ui/classes";
import { useToast } from "@/components/ui/toast";

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

export function InvoiceUploadForm() {
  const defaultPeriod = getDefaultPeriod();
  const [year, setYear] = useState(defaultPeriod.year);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successInvoiceId, setSuccessInvoiceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessInvoiceId(null);

    if (!file) {
      setError("Invoice PDF is required");
      return;
    }

    const formData = new FormData();
    formData.append("year", String(year));
    formData.append("month", String(month));
    if (invoiceNumber.trim()) {
      formData.append("invoiceNumber", invoiceNumber.trim());
    }
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
      toast.success("Invoice uploaded successfully.");
      setFile(null);
      setInvoiceNumber("");
      form.reset();
    } catch {
      setError("Failed to upload invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="invoice-year" required>
            Year
          </FieldLabel>
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
          <FieldLabel htmlFor="invoice-month" required>
            Month
          </FieldLabel>
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
          <FieldLabel htmlFor="invoice-file" required>
            Invoice PDF
          </FieldLabel>
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

      {error ? <p className={ui.alertError}>{error}</p> : null}

      {successInvoiceId ? (
        <div className="rounded-md border border-border bg-surface-muted/50 p-4 text-sm">
          <p>
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
