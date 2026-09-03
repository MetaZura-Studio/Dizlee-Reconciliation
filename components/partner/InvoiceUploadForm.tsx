/**
 * Upload a partner invoice file for a selected OpCo and period.
 * Validates input and registers the submission with the platform.
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { FileDropField } from "@/components/ui/file-drop-field";
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
    <FormLayout className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-4 lg:space-y-0">
      <LoadingOverlay
        active={isSubmitting}
        label="Uploading invoice…"
        className="min-h-0"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <PageSection
            title="Invoice details"
            description="Choose the billing period, optional invoice number, and PDF."
            className="p-3 sm:p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
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

              <div className="sm:col-span-2">
                <FieldLabel htmlFor="invoice-file" required>
                  Invoice PDF
                </FieldLabel>
                <FileDropField
                  id="invoice-file"
                  name="file"
                  accept=".pdf,application/pdf"
                  emptyLabel="Drop PDF here or browse"
                  hint="Signed invoice PDF only (.pdf)"
                  value={file}
                  onChange={setFile}
                  required
                  disabled={isSubmitting}
                  compact
                  className="mt-1.5"
                />
              </div>
            </div>

            {error ? <p className={`mt-3 ${ui.alertError}`}>{error}</p> : null}

            {successInvoiceId ? (
              <div className="mt-3 rounded-2xl border border-border bg-surface p-3 text-sm">
                <p className="font-medium text-foreground">Upload complete</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link href="/partner/invoices/upload" className="underline">
                    Upload another
                  </Link>
                  <Link href="/partner/invoices" className="underline">
                    View invoices
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Uploading..." : "Upload invoice"}
              </Button>
            </div>
          </PageSection>
        </form>
      </LoadingOverlay>

      <HelpPanel title="Quick tips" className="p-3 sm:p-4 lg:sticky lg:top-4">
        <ul className="list-disc space-y-1 pl-4">
          <li>PDF only — match the OpCo billing period.</li>
          <li>
            Period: {MONTHS[month - 1]} {year}.
          </li>
          <li>Leave invoice number blank to auto-generate.</li>
        </ul>
      </HelpPanel>
    </FormLayout>
  );
}
