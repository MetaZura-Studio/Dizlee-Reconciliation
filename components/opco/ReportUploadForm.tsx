"use client";

import Link from "next/link";
import { useState } from "react";

import type { LinkedPartner } from "@/lib/opco/queries/partners";
import { getDefaultPeriod } from "@/lib/opco/period";

type ReportUploadFormProps = {
  partners: LinkedPartner[];
};

type UploadSuccess = {
  reportId: string;
  lineItemCount: number;
};

export function ReportUploadForm({ partners }: ReportUploadFormProps) {
  const defaultPeriod = getDefaultPeriod();
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [year, setYear] = useState(defaultPeriod.year);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Excel file is required");
      return;
    }

    const formData = new FormData();
    formData.append("partnerId", partnerId);
    formData.append("year", String(year));
    formData.append("month", String(month));
    formData.append("file", file);

    setIsSubmitting(true);
    const form = event.currentTarget;

    try {
      const response = await fetch("/api/opco/reports/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        reportId?: string;
        lineItemCount?: number;
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to upload report");
        return;
      }

      setSuccess({
        reportId: payload.reportId ?? "",
        lineItemCount: payload.lineItemCount ?? 0,
      });
      setFile(null);
      form.reset();
    } catch {
      setError("Failed to upload report");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (partners.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        No partners are linked to your OpCo yet. Ask an admin to configure
        OpCo–Partner links before uploading reports.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="partnerId" className="text-sm font-medium text-zinc-700">
            Partner
          </label>
          <select
            id="partnerId"
            name="partnerId"
            value={partnerId}
            onChange={(event) => setPartnerId(event.target.value)}
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          >
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="year" className="text-sm font-medium text-zinc-700">
            Year
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="month" className="text-sm font-medium text-zinc-700">
            Month
          </label>
          <input
            id="month"
            name="month"
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="file" className="text-sm font-medium text-zinc-700">
            Excel report (.xlsx)
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-zinc-700"
            required
          />
          <p className="mt-2 text-xs text-zinc-500">
            Expected columns include description, usage_amount, usage_usd,
            amount, exchange_rate, usage_unit, and reconciliation_basis.
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>
            Report uploaded successfully with {success.lineItemCount} line items.
          </p>
          <p className="mt-1">
            <Link href="/opco/reports" className="underline">
              View reports history
            </Link>
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Uploading..." : "Upload report"}
      </button>
    </form>
  );
}
