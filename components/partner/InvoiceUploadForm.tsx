/**
 * Upload a partner invoice file for a selected OpCo and period.
 * Validates input and registers the submission with the platform.
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import {
  FormLayout,
  HelpPanel,
  PageSection,
} from "@/components/ui/page";
import { LoadingOverlay } from "@/components/ui/loading";
import { getDefaultPeriod } from "@/lib/partner/period";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { ui } from "@/lib/ui/classes";
import { useToast } from "@/components/ui/toast";
import { formatAppError } from "@/lib/errors/format";

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
        setError(formatAppError(payload, "Failed to upload invoice"));
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
    <FormLayout>
      <LoadingOverlay
        active={isSubmitting}
        label="Uploading invoice…"
        className="min-h-[12rem]"
      >
      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <PageSection
          title="Invoice details"
          description="Choose the billing period and optionally set an invoice number."
        >
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="invoice-year" required>
                Year
              </FieldLabel>
              <Select
                id="invoice-year"
                name="year"
                value={year}
                onChange={(event) =>
                  handleYearChange(Number(event.target.value))
                }
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
              <FieldLabel htmlFor="invoice-number">
                Invoice number (optional)
              </FieldLabel>
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
          </div>
        </PageSection>

        <PageSection
          title="Invoice PDF"
          description="Upload the signed invoice PDF for this period."
        >
          <input
            id="invoice-file"
            name="file"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-foreground-muted"
            required
          />
          {file ? (
            <p className="mt-2 text-xs text-foreground-subtle">{file.name}</p>
          ) : null}

          {error ? <p className={`mt-4 ${ui.alertError}`}>{error}</p> : null}

          {successInvoiceId ? (
            <div className="mt-4 rounded-[18px] border border-border bg-surface p-4 text-sm">
              <p className="font-medium text-foreground">Upload complete</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/partner/invoices/upload" className="underline">
                  Upload another
                </Link>
                <Link href="/partner/invoices" className="underline">
                  View invoices
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload invoice"}
            </Button>
          </div>
        </PageSection>

        <HelpPanel title="Quick tips">
          <ul className="list-disc space-y-1.5 pl-4">
            <li>PDF only — match the OpCo billing period.</li>
            <li>
              Period: {MONTHS[month - 1]} {year}.
            </li>
            <li>Leave invoice number blank to auto-generate.</li>
          </ul>
        </HelpPanel>
      </form>
      </LoadingOverlay>
    </FormLayout>
  );
}
